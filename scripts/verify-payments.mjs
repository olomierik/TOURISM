import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { pool } from './db.mjs';

/**
 * Verification for the payment and subscription surface.
 *
 * The Flutterwave calls themselves cannot be exercised without an account, and
 * a mocked provider would only prove the mock works. What is testable is
 * everything that decides whether a payment is honoured, and that is the part
 * worth guarding:
 *
 *   - a replayed webhook must not buy a second month
 *   - an operator must not be able to write their own payment or subscription
 *   - an active subscription must move the business tier, because ranking reads
 *     the tier and never joins through subscriptions
 *
 * Client-role assertions go through the publishable key. The service key
 * bypasses RLS entirely, and a test written with it would pass whether or not a
 * single policy existed.
 */

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const anonClient = () =>
  createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });

let pass = 0;
let fail = 0;
const createdUsers = [];
const createdBusinesses = [];

const check = (label, ok, detail = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

async function makeOwner() {
  const email = `pay-probe-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Payment Probe', role: 'business_owner' },
  });
  if (error) throw new Error(`makeOwner: ${error.message}`);
  createdUsers.push(data.user.id);

  const client = anonClient();
  const { error: sErr } = await client.auth.signInWithPassword({ email, password });
  if (sErr) throw new Error(`signIn: ${sErr.message}`);

  const { data: biz, error: bErr } = await admin
    .from('businesses')
    .insert({
      owner_id: data.user.id,
      name: `Pay Probe Safaris ${crypto.randomUUID().slice(0, 6)}`,
      slug: `pay-probe-${crypto.randomUUID().slice(0, 8)}`,
      status: 'approved',
    })
    .select('id, tier')
    .single();
  if (bErr) throw new Error(`makeBusiness: ${bErr.message}`);
  createdBusinesses.push(biz.id);

  return { client, id: data.user.id, businessId: biz.id };
}

async function main() {
  const owner = await makeOwner();

  console.log('\n--- A replayed webhook cannot double-credit ---');

  const ref = `probe-tx-${crypto.randomUUID().slice(0, 12)}`;

  const first = await admin.from('payments').insert({
    business_id: owner.businessId,
    amount: 49,
    currency: 'USD',
    status: 'succeeded',
    provider: 'flutterwave',
    provider_ref: ref,
  });
  check('a payment records once', !first.error, first.error?.message ?? '');

  const replay = await admin.from('payments').insert({
    business_id: owner.businessId,
    amount: 49,
    currency: 'USD',
    status: 'succeeded',
    provider: 'flutterwave',
    provider_ref: ref,
  });
  check('the same provider reference cannot be recorded twice',
    replay.error?.code === '23505', replay.error?.code ?? 'no error');

  // Two providers may legitimately issue the same reference string.
  const otherProvider = await admin.from('payments').insert({
    business_id: owner.businessId,
    amount: 49,
    currency: 'USD',
    status: 'succeeded',
    provider: 'stripe',
    provider_ref: ref,
  });
  check('the same reference from a different provider is allowed',
    !otherProvider.error, otherProvider.error?.message ?? '');

  console.log('\n--- An operator cannot pay themselves into a plan ---');

  const { error: payWrite } = await owner.client.from('payments').insert({
    business_id: owner.businessId,
    amount: 149,
    currency: 'USD',
    status: 'succeeded',
    provider: 'flutterwave',
    provider_ref: `self-${crypto.randomUUID().slice(0, 8)}`,
  });
  check('an operator cannot insert a payment', Boolean(payWrite),
    payWrite?.code ?? 'no error');

  const { data: featured } = await admin
    .from('subscription_plans')
    .select('id, tier, price_monthly')
    .eq('key', 'featured')
    .single();

  const { error: subWrite } = await owner.client.from('subscriptions').insert({
    business_id: owner.businessId,
    plan_id: featured.id,
    status: 'active',
  });
  check('an operator cannot create their own subscription', Boolean(subWrite),
    subWrite?.code ?? 'no error');

  const { data: stillFree } = await admin
    .from('businesses')
    .select('tier')
    .eq('id', owner.businessId)
    .single();
  check('the listing is still on the free tier', stillFree.tier === 'free', stillFree.tier);

  console.log('\n--- An honoured payment moves the tier ---');

  const { error: subErr } = await admin.from('subscriptions').insert({
    business_id: owner.businessId,
    plan_id: featured.id,
    status: 'active',
    provider: 'flutterwave',
    provider_ref: ref,
  });
  check('an active subscription can be created server-side', !subErr,
    subErr?.message ?? '');

  const { data: upgraded } = await admin
    .from('businesses')
    .select('tier')
    .eq('id', owner.businessId)
    .single();
  // Ranking reads businesses.tier and never joins through subscriptions, so a
  // trigger that failed here would take the operator's money and change nothing
  // they can see.
  check('the business tier followed the subscription', upgraded.tier === featured.tier,
    `${upgraded.tier} vs ${featured.tier}`);

  const { error: secondActive } = await admin.from('subscriptions').insert({
    business_id: owner.businessId,
    plan_id: featured.id,
    status: 'active',
  });
  check('a business cannot hold two active subscriptions',
    secondActive?.code === '23505', secondActive?.code ?? 'no error');

  console.log('\n--- Cancelling returns the tier ---');

  await admin
    .from('subscriptions')
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('business_id', owner.businessId)
    .eq('status', 'active');

  const { data: downgraded } = await admin
    .from('businesses')
    .select('tier')
    .eq('id', owner.businessId)
    .single();
  check('the tier fell back to free on cancellation', downgraded.tier === 'free',
    downgraded.tier);

  console.log('\n--- Billing history is visible to its owner and nobody else ---');

  const { data: anonSees } = await anonClient().from('payments').select('id');
  check('an anonymous visitor cannot read payments', (anonSees ?? []).length === 0);

  // Reading their own is intended — an operator is entitled to their billing
  // history, and payments_read_own grants exactly that. The property worth
  // asserting is the boundary, not the absence.
  const { data: ownSees } = await owner.client
    .from('payments')
    .select('id')
    .eq('business_id', owner.businessId);
  check('an operator can read their own payments', (ownSees ?? []).length > 0,
    `${(ownSees ?? []).length} rows`);

  const stranger = await makeOwner();
  const { data: strangerSees } = await stranger.client
    .from('payments')
    .select('id')
    .eq('business_id', owner.businessId);
  check('an operator cannot read another operator\'s payments',
    (strangerSees ?? []).length === 0, `${(strangerSees ?? []).length} rows`);

  const { data: strangerSubs } = await stranger.client
    .from('subscriptions')
    .select('id')
    .eq('business_id', owner.businessId);
  check('an operator cannot read another operator\'s subscriptions',
    (strangerSubs ?? []).length === 0, `${(strangerSubs ?? []).length} rows`);
}

async function cleanup() {
  const client = await pool.connect();
  try {
    if (createdBusinesses.length) {
      await client.query('delete from payments where business_id = any($1::uuid[])', [
        createdBusinesses,
      ]);
      await client.query('delete from businesses where id = any($1::uuid[])', [
        createdBusinesses,
      ]);
    }
    for (const id of createdUsers) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
    console.log(
      `\n  cleaned up ${createdBusinesses.length} businesses, ${createdUsers.length} accounts`,
    );
  } finally {
    client.release();
  }
}

try {
  await main();
} catch (err) {
  fail++;
  console.error('\nAborted:', err.message);
} finally {
  await cleanup();
  await pool.end();
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  console.log('='.repeat(50) + '\n');
  if (fail > 0) process.exitCode = 1;
}
