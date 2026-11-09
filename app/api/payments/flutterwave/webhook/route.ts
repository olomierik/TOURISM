import { createAdminClient } from '@/lib/supabase/admin';
import { verifyTransaction, verifyWebhookSignature } from '@/lib/payments/flutterwave';

/**
 * Flutterwave webhook.
 *
 * This endpoint grants paid access, so it is written on the assumption that
 * anyone on the internet can post to it — which they can.
 *
 * Three defences, in order:
 *
 *   1. The signature proves the sender. Constant-time, and a miss is a flat 401
 *      with nothing else attempted.
 *   2. The body is never believed. It states its own amount and status; a forged
 *      one claiming a successful $200 payment would otherwise buy a featured
 *      listing for the cost of an HTTP request. The transaction is re-read from
 *      Flutterwave and only their answer is used.
 *   3. The unique index on (provider, provider_ref) makes a replayed webhook a
 *      no-op rather than a second year of subscription.
 *
 * It always answers 200 once the signature passes. A provider that receives a
 * 500 retries, and retrying will not fix a transaction we have decided not to
 * honour — it will only produce the same failure every few minutes until someone
 * notices. Failures are logged and left for reconciliation against the pending
 * payment rows the checkout action writes.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!verifyWebhookSignature(request.headers.get('verif-hash'))) {
    return new Response('Invalid signature', { status: 401 });
  }

  let event: { data?: { id?: number | string } };
  try {
    event = (await request.json()) as typeof event;
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const transactionId = event.data?.id;
  if (!transactionId) return new Response('ok', { status: 200 });

  try {
    await handleTransaction(transactionId);
  } catch (err) {
    console.error('[flutterwave webhook]', err);
  }

  return new Response('ok', { status: 200 });
}

async function handleTransaction(transactionId: string | number) {
  const tx = await verifyTransaction(transactionId);
  const admin = createAdminClient();

  const businessId = tx.meta.business_id;
  const planId = tx.meta.plan_id;

  const { error: payErr } = await admin.from('payments').insert({
    business_id: businessId ?? null,
    amount: tx.amount,
    currency: tx.currency,
    status: tx.status === 'successful' ? 'succeeded' : tx.status === 'failed' ? 'failed' : 'pending',
    provider: 'flutterwave',
    provider_ref: tx.providerRef,
    method: tx.method,
    raw: tx.raw as never,
    paid_at: tx.status === 'successful' ? new Date().toISOString() : null,
    failed_reason: tx.status === 'failed' ? 'Reported failed by provider' : null,
  });

  // 23505 is the idempotency index doing its job: this transaction has already
  // been recorded, so there is nothing further to do. Not an error.
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

  // The annual price: plans have billed annually since migration 042, and this
  // route went on comparing against price_monthly, which is a twelfth of it.
  // A plan has to have one — a null price is not something to provision from.
  const planPrice = Number(plan.price_yearly ?? 0);
  if (planPrice <= 0) {
    throw new Error(`Plan ${planId} has no annual price; refusing to provision ${tx.providerRef}`);
  }

  // Exact, unlike the Paddle route's floor: Flutterwave is not the merchant of
  // record, so it adds no tax of its own to what we asked it to charge.
  if (planPrice !== tx.amount) {
    throw new Error(
      `Amount mismatch on ${tx.providerRef}: paid ${tx.amount}, plan is ${planPrice}`,
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

  if (current) {
    await admin
      .from('subscriptions')
      .update({
        plan_id: plan.id,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        canceled_at: null,
        provider: 'flutterwave',
        provider_ref: tx.providerRef,
      })
      .eq('id', current.id);
  } else {
    await admin.from('subscriptions').insert({
      business_id: businessId,
      plan_id: plan.id,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      provider: 'flutterwave',
      provider_ref: tx.providerRef,
    });
  }
}
