import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { pool } from './db.mjs';
import { createDirectoryFixtures, dropDirectoryFixtures } from './fixtures.mjs';

/**
 * Business dashboard verification.
 *
 * This is the exact access path that hit the RLS recursion fixed in migration
 * 019 — an owner reading their own leads — so it is exercised here as the real
 * `authenticated` role rather than through the service key, which would bypass
 * the policies entirely and prove nothing.
 *
 * Also checks the pipeline transitions and that response statistics update, since
 * those numbers feed directory ranking and are worth money to an operator.
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

let pass = 0;
let fail = 0;
const createdUsers = [];
const createdLeads = [];

const check = (label, ok, detail = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

const stamp = Date.now();

/** Runs fn as `authenticated` with the given uid, always rolled back. */
async function asOwner(uid, fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('select set_config($1,$2,true)', [
      'request.jwt.claims',
      JSON.stringify({ sub: uid, role: 'authenticated' }),
    ]);
    await client.query('set local role authenticated');
    return await fn(client);
  } finally {
    await client.query('rollback').catch(() => {});
    client.release();
  }
}

async function main() {
  // Two owners, so "can see mine" and "cannot see theirs" are both real.
  const { data: ownerA } = await admin.auth.admin.createUser({
    email: `dash-a-${stamp}@example.test`,
    password: 'Str0ng-Passphrase!42',
    email_confirm: true,
    user_metadata: { role: 'business_owner', full_name: 'Owner A' },
  });
  const { data: ownerB } = await admin.auth.admin.createUser({
    email: `dash-b-${stamp}@example.test`,
    password: 'Str0ng-Passphrase!42',
    email_confirm: true,
    user_metadata: { role: 'business_owner', full_name: 'Owner B' },
  });
  createdUsers.push(ownerA.user.id, ownerB.user.id);

  // Fixture rows only. This used to take "the first two approved businesses",
  // which was harmless while every approved business came from the demo seed and
  // catastrophic the moment it did not: the suite reassigns owner_id, so after
  // the seed was deleted it took a real listing, handed it to a probe account,
  // and the account's deletion set the owner to null. Matching on the fixture
  // prefix means the suite can only ever mutate rows it created.
  const { data: businesses } = await admin
    .from('businesses')
    .select('id, name')
    .like('slug', 'fixture-%')
    .eq('status', 'approved')
    .order('slug')
    .limit(2);

  if ((businesses?.length ?? 0) < 2) {
    throw new Error('dashboard suite needs two fixture businesses — createDirectoryFixtures did not run');
  }

  const [bizA, bizB] = businesses;
  await admin.from('businesses').update({ owner_id: ownerA.user.id }).eq('id', bizA.id);
  await admin.from('businesses').update({ owner_id: ownerB.user.id }).eq('id', bizB.id);

  // A lead routed to A only.
  const { data: lead } = await admin
    .from('leads')
    .insert({
      full_name: 'Dashboard Probe',
      email: `dash-lead-${stamp}@example.test`,
      phone: '+255700555666',
      message:
        'Dashboard verification enquiry with enough detail to be treated as a well-qualified lead.',
      adults: 2,
      budget_min: 4000,
    })
    .select('id, reference')
    .single();
  createdLeads.push(lead.id);

  const { data: lb } = await admin
    .from('lead_businesses')
    .insert({ lead_id: lead.id, business_id: bizA.id, rank: 1 })
    .select('id')
    .single();

  console.log('\n--- Owner reads their inbox (the recursion path) ---');

  await asOwner(ownerA.user.id, async (c) => {
    // Before migration 019 this threw "infinite recursion detected in policy".
    const { rows } = await c.query(`
      select lb.id, lb.status, lb.rank, l.reference, l.full_name, l.email
      from lead_businesses lb
      join leads l on l.id = lb.lead_id
      order by lb.sent_at desc
    `);
    check('the inbox query completes without recursion', true);
    check('owner A sees the lead routed to them',
      rows.some((r) => r.reference === lead.reference), `${rows.length} rows`);
    check('owner A can read the traveler contact details',
      rows.find((r) => r.reference === lead.reference)?.email?.includes('dash-lead'));
  });

  await asOwner(ownerB.user.id, async (c) => {
    const { rows } = await c.query(
      'select l.reference from lead_businesses lb join leads l on l.id = lb.lead_id',
    );
    check('owner B does NOT see owner A’s lead',
      !rows.some((r) => r.reference === lead.reference), `${rows.length} rows`);
  });

  console.log('\n--- Pipeline transitions ---');

  await asOwner(ownerA.user.id, async (c) => {
    const { rows: viewed } = await c.query(
      `update lead_businesses set status = 'viewed' where id = $1 and status = 'sent' returning status`,
      [lb.id],
    );
    check('owner can mark a lead as viewed', viewed[0]?.status === 'viewed');

    const { rows: responded } = await c.query(
      `update lead_businesses set status = 'responded' where id = $1
       returning status, responded_at is not null as stamped, response_minutes`,
      [lb.id],
    );
    check('owner can mark a lead as replied', responded[0]?.status === 'responded');
    check('responded_at is stamped automatically', responded[0]?.stamped === true);
    check('response_minutes is computed', responded[0]?.response_minutes !== null,
      `${responded[0]?.response_minutes} minutes`);

    // The stats trigger fires inside this transaction, which is rolled back at
    // the end — so they have to be asserted here, not afterwards.
    const { rows: stats } = await c.query(
      'select response_rate, avg_response_minutes from businesses where id = $1',
      [bizA.id],
    );
    check('response_rate is recomputed after a reply', stats[0]?.response_rate !== null,
      `${stats[0]?.response_rate}%`);
    check('avg_response_minutes is recomputed',
      stats[0]?.avg_response_minutes !== null,
      `${stats[0]?.avg_response_minutes} min`);

    // Rank and match_reason are the distribution record itself.
    await c.query('savepoint guard');
    let blocked = false;
    let seen = '(no error)';
    try {
      // Must differ from the current rank: setting a column to the value it
      // already holds is not a change, so the guard has nothing to reject.
      await c.query('update lead_businesses set rank = 99 where id = $1', [lb.id]);
    } catch (err) {
      seen = err.message;
      blocked = /cannot be rewritten/.test(err.message);
    }
    await c.query('rollback to savepoint guard');
    check('owner CANNOT rewrite their distribution rank', blocked, seen);

    await c.query('savepoint guard2');
    let stolen = false;
    try {
      const { rows } = await c.query(
        `update lead_businesses set status = 'won' where business_id = $1 returning id`,
        [bizB.id],
      );
      stolen = rows.length > 0;
    } catch {
      stolen = false;
    }
    await c.query('rollback to savepoint guard2');
    check('owner CANNOT update another business’s lead rows', !stolen);
  });

  console.log('\n--- Profile editing ---');

  await asOwner(ownerA.user.id, async (c) => {
    const { rows: edited } = await c.query(
      `update businesses set city = 'Edited City', whatsapp = '+255700000999'
       where id = $1 returning city`,
      [bizA.id],
    );
    check('owner can edit their own profile fields', edited[0]?.city === 'Edited City');

    const { rows: tr } = await c.query(
      `insert into business_translations (business_id, locale, tagline)
       values ($1, 'de', 'Dashboard Test Slogan')
       on conflict (business_id, locale) do update set tagline = excluded.tagline
       returning tagline`,
      [bizA.id],
    );
    check('owner can upsert a translation for their business',
      tr[0]?.tagline === 'Dashboard Test Slogan');

    // No need to force is_verified false here: fixtures are created unverified,
    // and doing it inside the owner-impersonated transaction is exactly what the
    // guard exists to refuse — which aborts the transaction and fails every
    // assertion after it.

    for (const [label, sql, pattern] of [
      ['owner CANNOT self-verify', `update businesses set is_verified = true where id = $1`, /administrator decision/],
      ['owner CANNOT change their own tier', `update businesses set tier = 'featured' where id = $1`, /subscription/],
    ]) {
      await c.query('savepoint p');
      let blocked = false;
      let seen = '(no error)';
      try {
        await c.query(sql, [bizA.id]);
      } catch (err) {
        seen = err.message;
        blocked = pattern.test(err.message);
      }
      await c.query('rollback to savepoint p');
      check(label, blocked, seen);
    }
  });

  // Response statistics are asserted inside the owner transaction above, not
  // here: asOwner always rolls back, so any read at this point sees the
  // pre-update committed values and could only ever pass by accident.
}

try {
  // The directory assertions need operators to rank, match and search.
  // Built here rather than assumed, so the suite does not depend on the demo
  // seed or on whatever the live site currently contains.
  await createDirectoryFixtures();
  await main();
} catch (err) {
  fail++;
  console.error('\nAborted:', err.message);
} finally {
  await dropDirectoryFixtures();
  for (const id of createdLeads) await admin.from('leads').delete().eq('id', id);
  // Detach the test owners so the demo businesses go back to unowned.
  for (const id of createdUsers) {
    await admin.from('businesses').update({ owner_id: null }).eq('owner_id', id);
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  console.log(`\n  cleaned up ${createdLeads.length} leads, ${createdUsers.length} accounts`);
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  console.log('='.repeat(50) + '\n');
  await pool.end();
  if (fail > 0) process.exitCode = 1;
}
