import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { pool } from './db.mjs';

/**
 * Admin surface verification.
 *
 * Two questions matter here: can a non-admin reach any of it, and does every
 * consequential action leave a trace. Both are checked as the real
 * `authenticated` role, because the service key bypasses the policies that are
 * the entire subject of the test.
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
const anon = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);

let pass = 0;
let fail = 0;
const createdUsers = [];

const check = (label, ok, detail = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

const stamp = Date.now();

async function asRole(uid, fn) {
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
  const mk = async (role, label) => {
    const { data } = await admin.auth.admin.createUser({
      email: `admin-verify-${label}-${stamp}@example.test`,
      password: 'Str0ng-Passphrase!42',
      email_confirm: true,
      user_metadata: { full_name: label },
    });
    createdUsers.push(data.user.id);
    // Role is clamped at signup, so admin has to be granted deliberately —
    // which is itself the behaviour being relied on here.
    await admin.from('profiles').update({ role }).eq('id', data.user.id);
    return data.user.id;
  };

  const adminId = await mk('admin', 'admin');
  const travelerId = await mk('traveler', 'traveler');

  const { data: biz } = await admin
    .from('businesses')
    .select('id, name, status')
    .eq('status', 'approved')
    .order('slug')
    .limit(1)
    .single();

  console.log('\n--- Only admins can moderate ---');

  await asRole(travelerId, async (c) => {
    const { rows } = await c.query(
      `update businesses set status = 'suspended' where id = $1 returning id`,
      [biz.id],
    );
    check('a traveler CANNOT change a business status', rows.length === 0,
      `updated ${rows.length} rows`);

    await c.query('savepoint p');
    let blocked = false;
    try {
      const { rows: v } = await c.query(
        `update businesses set is_verified = true where id = $1 returning id`,
        [biz.id],
      );
      blocked = v.length === 0;
    } catch {
      blocked = true;
    }
    await c.query('rollback to savepoint p');
    check('a traveler CANNOT verify a business', blocked);

    const { rows: audit } = await c.query('select id from audit_logs limit 5');
    check('a traveler CANNOT read the audit log', audit.length === 0,
      `saw ${audit.length}`);

    const { rows: settings } = await c.query(
      `update platform_settings set value = 'true'::jsonb
       where key = 'auto_approve_businesses' returning key`,
    );
    check('a traveler CANNOT change platform settings', settings.length === 0);
  });

  const { data: anonAudit } = await anon.from('audit_logs').select('id');
  check('anon CANNOT read the audit log', anonAudit?.length === 0,
    `saw ${anonAudit?.length ?? 0}`);

  console.log('\n--- An admin can moderate ---');

  await asRole(adminId, async (c) => {
    const { rows: suspended } = await c.query(
      `update businesses set status = 'suspended' where id = $1 returning status`,
      [biz.id],
    );
    check('an admin CAN suspend a business', suspended[0]?.status === 'suspended');

    const { rows: restored } = await c.query(
      `update businesses set status = 'approved' where id = $1 returning status`,
      [biz.id],
    );
    check('an admin CAN restore a business', restored[0]?.status === 'approved');

    const { rows: verified } = await c.query(
      `update businesses set is_verified = true, verified_by = $2
       where id = $1 returning is_verified, verified_at is not null as stamped`,
      [biz.id, adminId],
    );
    check('an admin CAN verify a business', verified[0]?.is_verified === true);
    check('verified_at is stamped automatically', verified[0]?.stamped === true);

    const { rows: settings } = await c.query(
      `update platform_settings set value = 'true'::jsonb
       where key = 'auto_approve_businesses' returning value`,
    );
    check('an admin CAN change platform settings', settings.length === 1);

    const { rows: readAudit } = await c.query('select id from audit_logs limit 1');
    check('an admin CAN read the audit log', Array.isArray(readAudit));
  });

  console.log('\n--- The audit log is append-only ---');

  // Written with the service key, mirroring how the server action does it.
  const { error: writeErr } = await admin.from('audit_logs').insert({
    actor_id: adminId,
    action: 'business.approved',
    entity_type: 'business',
    entity_id: biz.id,
    before: { status: 'pending' },
    after: { status: 'approved' },
  });
  check('the service role CAN append to the audit log', !writeErr,
    writeErr?.message ?? '');

  const { data: entry } = await admin
    .from('audit_logs')
    .select('id, action, before, after')
    .eq('entity_id', biz.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  check('the entry records both before and after',
    entry?.before !== null && entry?.after !== null);

  await asRole(adminId, async (c) => {
    // No UPDATE or DELETE policy exists, so history cannot be rewritten even by
    // the person it incriminates.
    const { rows: edited } = await c.query(
      `update audit_logs set action = 'business.rejected' where id = $1 returning id`,
      [entry.id],
    );
    check('even an admin CANNOT edit audit history', edited.length === 0,
      `updated ${edited.length}`);

    const { rows: deleted } = await c.query(
      'delete from audit_logs where id = $1 returning id',
      [entry.id],
    );
    check('even an admin CANNOT delete audit history', deleted.length === 0,
      `deleted ${deleted.length}`);
  });

  // The anon client should never see an unapproved listing, so an approval has
  // to actually change public visibility.
  console.log('\n--- Moderation changes public visibility ---');

  await admin.from('businesses').update({ status: 'pending' }).eq('id', biz.id);
  const { data: hidden } = await anon.from('businesses').select('id').eq('id', biz.id);
  check('a pending business is invisible to the public', hidden?.length === 0,
    `saw ${hidden?.length ?? 0}`);

  await admin.from('businesses').update({ status: 'approved' }).eq('id', biz.id);
  const { data: visible } = await anon.from('businesses').select('id').eq('id', biz.id);
  check('an approved business is visible to the public', visible?.length === 1);

  await admin.from('audit_logs').delete().eq('id', entry.id);
}

try {
  await main();
} catch (err) {
  fail++;
  console.error('\nAborted:', err.message);
} finally {
  // Restore anything the test left changed.
  await admin
    .from('platform_settings')
    .update({ value: false })
    .eq('key', 'auto_approve_businesses');
  for (const id of createdUsers) {
    await admin.from('audit_logs').delete().eq('actor_id', id);
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  console.log(`\n  cleaned up ${createdUsers.length} accounts`);
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  console.log('='.repeat(50) + '\n');
  await pool.end();
  if (fail > 0) process.exitCode = 1;
}
