import { createAdminClient } from '@/lib/supabase/admin';
import { getTransaction, verifyWebhook } from '@/lib/payments/paddle';

/**
 * Paddle webhook.
 *
 * The sibling of `../flutterwave/webhook/route.ts`, written to the same rules
 * because it grants paid access and anyone on the internet can post to it.
 *
 * Three defences, in order:
 *
 *   1. The signature proves the sender. `verifyWebhook` does the HMAC in
 *      constant time and rejects anything over five seconds old, so a captured
 *      request cannot be replayed. A miss is a flat 401 with nothing else
 *      attempted.
 *   2. The body is never believed. It states its own amount and status; the
 *      transaction is re-read from Paddle and only their answer is used.
 *   3. The unique index on (provider, provider_ref) makes a duplicate delivery
 *      a no-op rather than a second year of subscription. Paddle retries, and
 *      at-least-once delivery is the contract, not an edge case.
 *
 * It answers 200 once the signature passes. A 500 makes Paddle retry, and
 * retrying will not fix a transaction we have decided not to honour — it will
 * only repeat the same failure until someone notices. Failures are logged for
 * reconciliation against the pending rows `startCheckout` writes.
 *
 * One thing this route must not do is let a framework touch the body first.
 * Signature verification needs the exact bytes Paddle sent, so `request.text()`
 * is the first thing that reads it and nothing re-serialises it afterwards.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const result = await verifyWebhook(rawBody, request.headers.get('paddle-signature'));

  if (!result.ok) {
    if (result.reason === 'signature') return new Response('Invalid signature', { status: 401 });

    // Signed by Paddle, but this SDK version cannot build an entity from it —
    // a newer event type, most likely. 200, because retrying will produce the
    // same failure and a 401 here would look like a wrong secret.
    console.error('[paddle webhook] signed payload could not be parsed', result.error);
    return new Response('ok', { status: 200 });
  }

  const event = result.event;

  // Only completed transactions move money. `subscription.*` events arrive too
  // and are useful for lifecycle work later, but provisioning from the payment
  // keeps one writer for the payments and subscriptions tables.
  if (event.eventType !== 'transaction.completed') {
    return new Response('ok', { status: 200 });
  }

  const transactionId = (event.data as { id?: string }).id;
  if (!transactionId) return new Response('ok', { status: 200 });

  try {
    await handleTransaction(transactionId);
  } catch (err) {
    console.error('[paddle webhook]', err);
  }

  return new Response('ok', { status: 200 });
}

async function handleTransaction(transactionId: string) {
  const tx = await getTransaction(transactionId);
  const admin = createAdminClient();

  const businessId = tx.meta.business_id;
  const planId = tx.meta.plan_id;

  const { error: payErr } = await admin.from('payments').insert({
    business_id: businessId ?? null,
    amount: tx.amount,
    currency: tx.currency,
    status: tx.status === 'successful' ? 'succeeded' : tx.status === 'failed' ? 'failed' : 'pending',
    provider: 'paddle',
    provider_ref: tx.providerRef,
    method: tx.method,
    raw: tx.raw as never,
    paid_at: tx.status === 'successful' ? new Date().toISOString() : null,
    failed_reason: tx.status === 'failed' ? 'Reported failed by provider' : null,
  });

  // 23505 is the idempotency index doing its job: this transaction is already
  // recorded, so there is nothing further to do. Not an error.
  if (payErr && payErr.code !== '23505') throw new Error(payErr.message);
  if (payErr?.code === '23505') return;

  if (tx.status !== 'successful' || !businessId || !planId) return;

  // The plan's real price, not the one the transaction reports. A payment for
  // the wrong amount is a reconciliation problem, not a licence to grant a tier.
  const { data: plan } = await admin
    .from('subscription_plans')
    .select('id, price_yearly, currency')
    .eq('id', planId)
    .maybeSingle();

  if (!plan) throw new Error(`Unknown plan ${planId} on transaction ${tx.providerRef}`);

  const planPrice = Number(plan.price_yearly ?? 0);
  if (planPrice <= 0) {
    throw new Error(`Plan ${planId} has no annual price; refusing to provision ${tx.providerRef}`);
  }

  // Paddle is Merchant of Record, so `grandTotal` is what the customer was
  // charged with the sales tax or VAT it collects on our behalf included.
  //
  // Which way the tax moves depends on Paddle's tax mode, and it is worth
  // knowing which one you are on, because it decides who pays it. Measured on
  // the sandbox account, 9 November 2026, on a real completed $120 checkout:
  // grandTotal 12000, subtotal 10169, tax 1831. That is **tax-inclusive** —
  // the operator paid exactly the plan price and Tanzania's 18% VAT came out
  // of it, so the sale nets 101.69 rather than 120, and a buyer in a
  // higher-VAT country nets us less again.
  //
  // The floor below is right under either mode: tax-exclusive makes
  // grandTotal larger than the plan price, tax-inclusive makes it exactly
  // equal, and neither is an underpayment. Comparing for equality instead
  // would reject every tax-exclusive sale, which is why this is a floor.
  if (tx.amount + 1e-6 < planPrice) {
    throw new Error(
      `Underpayment on ${tx.providerRef}: paid ${tx.amount} ${tx.currency}, plan is ${planPrice}`,
    );
  }

  // A year, because that is what was paid for. setFullYear rather than adding
  // 365 days so a leap year lands on the same calendar date.
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  // One active subscription per business is a unique index, so an existing one
  // is extended rather than duplicated. businesses.tier follows automatically —
  // the sync_business_tier trigger fires on this write.
  const { data: current } = await admin
    .from('subscriptions')
    .select('id')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .maybeSingle();

  // Paddle's own subscription id where it created one, so the row points at the
  // entity that will actually renew. Falling back to the transaction keeps the
  // column populated for a one-off.
  const providerRef = tx.subscriptionId ?? tx.providerRef;

  if (current) {
    await admin
      .from('subscriptions')
      .update({
        plan_id: plan.id,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        canceled_at: null,
        provider: 'paddle',
        provider_ref: providerRef,
      })
      .eq('id', current.id);
  } else {
    await admin.from('subscriptions').insert({
      business_id: businessId,
      plan_id: plan.id,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      provider: 'paddle',
      provider_ref: providerRef,
    });
  }
}
