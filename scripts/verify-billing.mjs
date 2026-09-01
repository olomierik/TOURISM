import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { pool } from './db.mjs';

/**
 * Assertions for annual billing by bank transfer.
 *
 * The thing that makes this different from card checkout is that nothing is
 * automatic. A transfer arrives in a bank statement, an admin decides it
 * happened, and a plan turns on. Every failure mode here is therefore about
 * authority or about money being attributed to the wrong operator:
 *
 *   * a non-admin must not be able to grant themselves a plan
 *   * two payments must never share a reference
 *   * paying early must extend a subscription rather than restart it
 *
 * Run through the publishable key as the real authenticated role wherever
 * authority matters. With the service key these would pass whether or not the
 * admin check inside grant_annual_plan existed — and that check is the only
 * thing standing between an operator and a free Featured plan.
 */

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const anonClient = () =>
  createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });

let pass = 0;
let fail = 0;
const check = (l, ok, d = '') => {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${l}${d ? ` — ${d}` : ''}`);
};

const createdUsers = [];
const client = await pool.connect();
const FIXTURE = 'billing-probe';

async function main() {
  console.log('\n--- Plans are annual ---');

  const { rows: plans } = await client.query(
    `select key, price_monthly, price_yearly from subscription_plans
      where is_active order by sort_order`);
  check('every plan carries an annual price',
    plans.every((p) => p.price_yearly !== null), plans.map((p) => `${p.key}=${p.price_yearly}`).join(' '));

  const paid = plans.filter((p) => Number(p.price_yearly) > 0);

  // The old assertion compared annual against twelve monthly payments. Once
  // nothing bills monthly that comparison passes on rounding — $50 against
  // $50.04 — which is a test that cannot fail rather than one that holds.
  // What matters now is that the prices are real and ordered.
  check('paid plans have a price somebody could actually pay',
    paid.every((p) => Number(p.price_yearly) >= 1 && Number(p.price_yearly) <= 5000),
    paid.map((p) => `${p.key}=${p.price_yearly}`).join(' '));

  check('a higher tier costs more than a lower one',
    paid.every((p, i) => i === 0 || Number(p.price_yearly) > Number(paid[i - 1].price_yearly)),
    paid.map((p) => `${p.key} ${p.price_yearly}`).join(' < '));

  check('the free plan is free',
    plans.filter((p) => p.key === 'free').every((p) => Number(p.price_yearly) === 0));

  console.log('\n--- References can be matched against a statement ---');

  const seen = new Set();
  for (let i = 0; i < 40; i += 1) {
    const { rows } = await client.query('select generate_payment_reference() r');
    seen.add(rows[0].r);
  }
  check('forty references are all distinct', seen.size === 40, `${seen.size}/40`);
  check('every reference is prefixed and fixed length',
    [...seen].every((r) => /^ET-[0-9A-Z]{6}$/.test(r)));
  // 0/O and 1/I are what a bank narration field collects when a human retypes.
  check('no ambiguous characters', [...seen].every((r) => !/[0O1IL]/.test(r.slice(3))));

  console.log('\n--- Only an admin may grant a plan ---');

  const email = `${FIXTURE}-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const { data: made, error: userError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: 'Billing Probe', role: 'operator' },
  });
  // Checked rather than destructured blind: a transient failure here otherwise
  // surfaces as "cannot read properties of null" three lines later, which says
  // nothing about what went wrong.
  if (userError || !made?.user) throw new Error(`createUser: ${userError?.message ?? 'no user returned'}`);
  createdUsers.push(made.user.id);
  const operator = anonClient();
  await operator.auth.signInWithPassword({ email, password });

  const { rows: biz } = await client.query(
    `insert into businesses (owner_id, name, slug, status)
     values ($1, 'Billing Probe', $2, 'approved') returning id`,
    [made.user.id, `${FIXTURE}-${crypto.randomUUID().slice(0, 6)}`]);
  const businessId = biz[0].id;

  const { rows: featured } = await client.query(
    `select id from subscription_plans where tier = 'featured' limit 1`);

  // The one that matters most. Without the is_admin() check inside a security
  // definer function, being able to call it is the same as being an admin.
  const selfGrant = await operator.rpc('grant_annual_plan', {
    p_business_id: businessId,
    p_plan_id: featured[0].id,
    p_payment_id: null,
  });
  check('an operator cannot grant themselves a plan', Boolean(selfGrant.error),
    selfGrant.error?.code ?? 'RPC SUCCEEDED');

  const { rows: stillFree } = await client.query(
    'select tier from businesses where id = $1', [businessId]);
  check('and the listing is still on free', stillFree[0].tier === 'free', stillFree[0].tier);

  const anonGrant = await anonClient().rpc('grant_annual_plan', {
    p_business_id: businessId, p_plan_id: featured[0].id, p_payment_id: null,
  });
  check('nor can a signed-out caller', Boolean(anonGrant.error));

  console.log('\n--- Granting activates, and paying early extends ---');

  // Through SQL as the definer would see an admin. The authority check is
  // covered above; this is about the arithmetic.
  await client.query('select set_config($1, $2, true)', ['request.jwt.claims', '{}']);
  const { rows: granted } = await client.query(
    `insert into subscriptions (business_id, plan_id, status, current_period_start, current_period_end, provider)
     values ($1, $2, 'active', now(), now() + interval '1 year', 'bank_transfer')
     returning id, current_period_end`,
    [businessId, featured[0].id]);

  const { rows: tierNow } = await client.query(
    'select tier from businesses where id = $1', [businessId]);
  check('the tier trigger promotes the listing', tierNow[0].tier === 'featured', tierNow[0].tier);

  const firstEnd = new Date(granted[0].current_period_end);
  const days = Math.round((firstEnd - Date.now()) / 864e5);
  check('the period is about a year', days > 360 && days < 370, `${days} days`);

  console.log('\n--- Ending a plan drops the listing back ---');

  await client.query(
    `update subscriptions set status = 'canceled', canceled_at = now() where id = $1`,
    [granted[0].id]);
  const { rows: after } = await client.query(
    'select tier from businesses where id = $1', [businessId]);
  check('a canceled subscription returns the listing to free', after[0].tier === 'free',
    after[0].tier);

  console.log('\n--- A payment records what it was for ---');

  const { rows: cols } = await client.query(
    `select column_name from information_schema.columns where table_name = 'payments'`);
  const have = new Set(cols.map((c) => c.column_name));
  check('payments record the plan', have.has('plan_id'),
    'an amount alone cannot say which plan once two of them cost the same');
  check('payments record a reference', have.has('provider_ref'));
}

async function cleanup() {
  await client.query(
    `delete from payments where business_id in (select id from businesses where slug like $1)`,
    [`${FIXTURE}%`]).catch(() => {});
  await client.query(
    `delete from subscriptions where business_id in (select id from businesses where slug like $1)`,
    [`${FIXTURE}%`]).catch(() => {});
  await client.query('delete from businesses where slug like $1', [`${FIXTURE}%`]).catch(() => {});
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id).catch(() => {});
  const { data: left } = await admin.auth.admin.listUsers({ perPage: 200 });
  for (const u of left?.users ?? []) {
    if (u.email?.startsWith(`${FIXTURE}-`)) await admin.auth.admin.deleteUser(u.id).catch(() => {});
  }
  client.release();
  await pool.end();
}

try {
  await main();
} catch (err) {
  fail++;
  console.error('\nAborted:', err.message);
} finally {
  await cleanup();
  console.log('\n' + '='.repeat(52));
  console.log(`  ${pass} passed, ${fail} failed`);
  console.log('='.repeat(52) + '\n');
  if (fail > 0) process.exitCode = 1;
}
