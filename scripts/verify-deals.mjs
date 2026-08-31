import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { pool } from './db.mjs';

/**
 * Verification for deals.
 *
 * The feature is a table with a headline and a date. The work is the guard
 * around it, because the failure mode is not a crash — it is a directory where
 * every listing says "was $1,200, now $890", nobody ever paid $1,200, and the
 * price signal that made the site worth reading is gone. Every check below is
 * one specific way that happens.
 *
 * Runs through the publishable key as the real `authenticated` role wherever
 * ownership or tier matters. A test written with the service key would pass
 * whether or not the policies and triggers existed.
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
const check = (label, ok, detail = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

const createdUsers = [];
const client = await pool.connect();

const days = (n) => new Date(Date.now() + n * 864e5).toISOString();

async function main() {
  // ---------------------------------------------------------------- fixtures
  const email = `deal-probe-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const { data: made, error: uErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: 'Deal Probe', role: 'operator' },
  });
  if (uErr) throw new Error(`makeUser: ${uErr.message}`);
  createdUsers.push(made.user.id);

  const owner = anonClient();
  const { error: sErr } = await owner.auth.signInWithPassword({ email, password });
  if (sErr) throw new Error(`signIn: ${sErr.message}`);

  const { rows: biz } = await client.query(
    `insert into businesses (owner_id, name, slug, status)
     values ($1, 'Deal Probe Safaris', 'deal-probe-' || substr(md5(random()::text),1,8), 'approved')
     returning id`,
    [made.user.id],
  );
  const businessId = biz[0].id;

  const { rows: pkg } = await client.query(
    `insert into packages (business_id, slug, price_from, currency, status, published_at)
     values ($1, 'deal-probe-pkg-' || substr(md5(random()::text),1,8), 1000, 'USD', 'published', now())
     returning id`,
    [businessId],
  );
  const packageId = pkg[0].id;

  const insert = (over = {}) =>
    owner.from('deals').insert({
      business_id: businessId,
      package_id: packageId,
      deal_price: 800,
      ends_at: days(30),
      ...over,
    }).select('id');

  console.log('\n--- A free plan cannot run deals ---');

  const free = await insert();
  check('an operator with no subscription is refused', Boolean(free.error),
    free.error?.message?.slice(0, 50) ?? 'INSERT SUCCEEDED');

  const { rows: freePlan } = await client.query(
    `select id from subscription_plans where tier = 'free' limit 1`);
  await client.query(
    `insert into subscriptions (business_id, plan_id, status) values ($1, $2, 'active')`,
    [businessId, freePlan[0].id]);
  const stillFree = await insert();
  check('an active free subscription is still refused', Boolean(stillFree.error));

  // Upgrade to premium for the rest.
  const { rows: paid } = await client.query(
    `select id from subscription_plans where tier = 'premium' limit 1`);
  await client.query(`update subscriptions set plan_id = $1 where business_id = $2`,
    [paid[0].id, businessId]);

  const ok = await insert();
  check('a premium operator can create one', !ok.error, ok.error?.message?.slice(0, 60) ?? '');
  const dealId = ok.data?.[0]?.id;

  console.log('\n--- The reference price cannot be invented ---');

  await owner.from('deals').delete().eq('id', dealId);

  const above = await insert({ deal_price: 1200 });
  check('a "deal" above the published price is refused', Boolean(above.error));

  const equal = await insert({ deal_price: 1000 });
  check('a deal at the published price is refused', Boolean(equal.error));

  const trivial = await insert({ deal_price: 980 });
  check('a 2% discount is refused as noise', Boolean(trivial.error),
    trivial.error?.message?.slice(0, 45) ?? 'INSERT SUCCEEDED');

  const absurd = await insert({ deal_price: 100 });
  check('a 90% discount is refused as a typo or a lie', Boolean(absurd.error),
    absurd.error?.message?.slice(0, 45) ?? 'INSERT SUCCEEDED');

  const sane = await insert({ deal_price: 800 });
  check('a 20% discount is accepted', !sane.error);
  const liveId = sane.data?.[0]?.id;

  // The whole point of rule 1: raising the "was" means raising the real price.
  const { rows: check1 } = await client.query(
    `select p.price_from, d.deal_price from deals d
       join packages p on p.id = d.package_id where d.id = $1`, [liveId]);
  check('the reference price is the package\'s own, not a stored copy',
    Number(check1[0].price_from) === 1000 && Number(check1[0].deal_price) === 800,
    `${check1[0].deal_price} off ${check1[0].price_from}`);

  console.log('\n--- A price claim needs something to claim against ---');

  const unanchored = await owner.from('deals').insert({
    business_id: businessId, package_id: null, deal_price: 500, ends_at: days(20),
  }).select('id');
  check('a discount with no package is refused', Boolean(unanchored.error));

  const included = await owner.from('deals').insert({
    business_id: businessId, package_id: null, deal_price: null, ends_at: days(20),
  }).select('id');
  check('an offer with no price claim is allowed', !included.error,
    included.error?.message?.slice(0, 50) ?? '');

  console.log('\n--- Deals end ---');

  const past = await insert({ ends_at: days(-1) });
  check('a deal ending in the past is refused', Boolean(past.error));

  const backwards = await insert({ starts_at: days(10), ends_at: days(5) });
  check('an end before its start is refused', Boolean(backwards.error));

  const forever = await insert({ ends_at: days(500) });
  check('a deal running longer than a year is refused', Boolean(forever.error));

  // Expiry is invisible to the public, not shown as "expired".
  // Aged rather than inserted expired: the trigger refuses an insert whose
  // end date is already past, which is the correct behaviour and means a
  // yesterday-shaped fixture has to be made by letting a live deal lapse.
  const { rows: expired } = await client.query(
    `insert into deals (business_id, package_id, deal_price, ends_at)
     values ($1, $2, 700, now() + interval '5 days') returning id`,
    [businessId, packageId]);
  await client.query(
    `update deals set starts_at = now() - interval '10 days',
                      ends_at   = now() - interval '1 day'
      where id = $1`, [expired[0].id]);
  const { data: publicSees } = await anonClient()
    .from('deals').select('id').eq('id', expired[0].id);
  check('an expired deal is invisible to the public', (publicSees ?? []).length === 0);

  const { rows: futureRow } = await client.query(
    `insert into deals (business_id, package_id, deal_price, starts_at, ends_at)
     values ($1, $2, 700, now() + interval '5 days', now() + interval '20 days')
     returning id`, [businessId, packageId]);
  const { data: earlySees } = await anonClient()
    .from('deals').select('id').eq('id', futureRow[0].id);
  check('a deal that has not started yet is invisible too', (earlySees ?? []).length === 0);

  console.log('\n--- Nobody discounts anybody else ---');

  const { rows: other } = await client.query(
    `insert into businesses (name, slug, status)
     values ('Someone Else', 'deal-probe-other-' || substr(md5(random()::text),1,8), 'approved')
     returning id`);
  const foreign = await owner.from('deals').insert({
    business_id: other[0].id, ends_at: days(10),
  }).select('id');
  check('an operator cannot post a deal for another business', Boolean(foreign.error),
    foreign.error?.code ?? 'INSERT SUCCEEDED');

  const { rows: otherPkg } = await client.query(
    `insert into packages (business_id, slug, price_from, status, published_at)
     values ($1, 'deal-probe-other-pkg-' || substr(md5(random()::text),1,8), 900, 'published', now())
     returning id`, [other[0].id]);
  const crossed = await owner.from('deals').insert({
    business_id: businessId, package_id: otherPkg[0].id, deal_price: 500, ends_at: days(10),
  }).select('id');
  check('nor discount a package that is not theirs', Boolean(crossed.error),
    crossed.error?.message?.slice(0, 45) ?? 'INSERT SUCCEEDED');

  console.log('\n--- The catalogue cannot be permanently on sale ---');

  await client.query('delete from deals where business_id = $1', [businessId]);
  let created = 0;
  for (let i = 0; i < 5; i += 1) {
    const r = await owner.from('deals').insert({
      business_id: businessId, package_id: null, ends_at: days(10 + i),
    }).select('id');
    if (!r.error) created += 1;
  }
  check('a fourth live deal is refused', created === 3, `${created} accepted of 5 attempted`);

  console.log('\n--- Copy has to say something ---');

  const { rows: anyDeal } = await client.query(
    'select id from deals where business_id = $1 limit 1', [businessId]);
  const short = await owner.from('deal_translations').insert({
    deal_id: anyDeal[0].id, locale: 'en', headline: '20% off', terms: 'Ask us.',
  }).select('id');
  check('a two-word headline is refused', Boolean(short.error));

  const thin = await owner.from('deal_translations').insert({
    deal_id: anyDeal[0].id, locale: 'en',
    headline: 'Third night free in the Serengeti', terms: 'Limited time.',
  }).select('id');
  check('terms of "limited time" are refused', Boolean(thin.error),
    'an offer nobody can check is not an offer');

  const good = await owner.from('deal_translations').insert({
    deal_id: anyDeal[0].id, locale: 'en',
    headline: 'Third night free in the Serengeti',
    terms: 'Minimum three nights, travel before 15 June, excludes park fees.',
  }).select('id');
  check('a headline with real terms is accepted', !good.error,
    good.error?.message?.slice(0, 50) ?? '');
}

async function cleanup() {
  await client.query(`delete from businesses where slug like 'deal-probe-%'`).catch(() => {});
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id).catch(() => {});
  const { data: left } = await admin.auth.admin.listUsers({ perPage: 200 });
  for (const u of left?.users ?? []) {
    if (u.email?.startsWith('deal-probe-')) await admin.auth.admin.deleteUser(u.id).catch(() => {});
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
