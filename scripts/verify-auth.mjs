import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { pool } from './db.mjs';

/**
 * Auth verification.
 *
 * Checks the parts that are invisible until someone actually signs up: that the
 * profile trigger fires, that it assigns the right role, and — most importantly —
 * that a self-declared "admin" at signup does not become one.
 *
 * Every account created here is deleted again at the end.
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

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

let pass = 0;
let fail = 0;
const created = [];

const check = (label, ok, detail = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

const stamp = Date.now();
const emailFor = (n) => `verify-${stamp}-${n}@example.test`;

async function createUser(n, metadata) {
  const { data, error } = await admin.auth.admin.createUser({
    email: emailFor(n),
    password: 'Str0ng-Passphrase!42',
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw new Error(`createUser(${n}) failed: ${error.message}`);
  created.push(data.user.id);
  return data.user;
}

async function profileOf(id) {
  const { rows } = await pool.query(
    'select role, full_name, locale, email from profiles where id = $1',
    [id],
  );
  return rows[0] ?? null;
}

async function main() {
  console.log('\n--- Signup trigger and role assignment ---');

  const traveler = await createUser('traveler', {
    full_name: 'Test Traveler',
    role: 'traveler',
    locale: 'de',
  });
  const tp = await profileOf(traveler.id);
  check('a profile row is created automatically on signup', tp !== null);
  check('traveler role is assigned', tp?.role === 'traveler', `got ${tp?.role}`);
  check('full name carries across from signup metadata', tp?.full_name === 'Test Traveler');
  check('locale carries across from signup metadata', tp?.locale === 'de', `got ${tp?.locale}`);
  check('email is mirrored onto the profile', tp?.email === emailFor('traveler'));

  const owner = await createUser('owner', {
    full_name: 'Test Owner',
    role: 'business_owner',
  });
  const op = await profileOf(owner.id);
  check('business_owner role is assigned when requested', op?.role === 'business_owner',
    `got ${op?.role}`);

  // The one that matters: admin must never be self-assignable at signup.
  const escalated = await createUser('escalated', {
    full_name: 'Would-be Admin',
    role: 'admin',
  });
  const ep = await profileOf(escalated.id);
  check('signing up as "admin" does NOT grant admin', ep?.role === 'traveler',
    `got ${ep?.role}`);

  const nonsense = await createUser('nonsense', { role: 'superuser' });
  const np = await profileOf(nonsense.id);
  check('an unrecognised role falls back to traveler', np?.role === 'traveler',
    `got ${np?.role}`);

  console.log('\n--- Role escalation after signup ---');

  // As the user themselves, via the authenticated role, promoting self must fail.
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('select set_config($1,$2,true)', [
      'request.jwt.claims',
      JSON.stringify({ sub: traveler.id, role: 'authenticated' }),
    ]);
    await client.query('set local role authenticated');

    // Savepoint required: a raised exception aborts the whole transaction, so
    // without one every later statement fails with "current transaction is
    // aborted" rather than doing what it was written to test.
    await client.query('savepoint escalation_test');
    let blocked = false;
    let seen = '(no error raised)';
    try {
      await client.query('update profiles set role = $1 where id = $2', [
        'admin',
        traveler.id,
      ]);
    } catch (err) {
      seen = err.message;
      blocked = /administrator/i.test(err.message);
    }
    await client.query('rollback to savepoint escalation_test');
    check('a signed-in user cannot promote themselves to admin', blocked, seen);

    // But ordinary profile edits must still work.
    const { rows } = await client.query(
      'update profiles set full_name = $1 where id = $2 returning full_name',
      ['Renamed', traveler.id],
    );
    check('a signed-in user can still edit their own profile',
      rows[0]?.full_name === 'Renamed');

    await client.query('rollback');
  } finally {
    client.release();
  }

  console.log('\n--- Session behaviour ---');

  const anon = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: signedIn, error: signInErr } = await anon.auth.signInWithPassword({
    email: emailFor('traveler'),
    password: 'Str0ng-Passphrase!42',
  });
  check('correct credentials produce a session', Boolean(signedIn?.session) && !signInErr,
    signInErr?.message ?? '');

  const { error: badErr } = await anon.auth.signInWithPassword({
    email: emailFor('traveler'),
    password: 'wrong-password',
  });
  check('wrong credentials are rejected', Boolean(badErr), badErr?.code ?? '');
  check('rejection uses the mapped invalid_credentials code',
    badErr?.code === 'invalid_credentials', `got ${badErr?.code}`);

  // A signed-in traveler reads their own profile and nobody else's.
  const { data: ownRows } = await anon.from('profiles').select('id');
  check('a signed-in user sees exactly one profile — their own',
    ownRows?.length === 1 && ownRows[0].id === traveler.id,
    `saw ${ownRows?.length ?? 0}`);
}

try {
  await main();
} catch (err) {
  fail++;
  console.error('\nAborted:', err.message);
} finally {
  for (const id of created) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  console.log(`\n  cleaned up ${created.length} test accounts`);
  console.log(`\n${'='.repeat(46)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  console.log('='.repeat(46) + '\n');
  await pool.end();
  if (fail > 0) process.exitCode = 1;
}
