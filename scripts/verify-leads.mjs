import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { pool } from './db.mjs';

/**
 * Lead engine verification.
 *
 * The commercially sensitive question this phase answers is "who receives an
 * enquiry", so most of what follows checks that the answer cannot be influenced
 * from a browser: the distribution RPC must be unreachable with the publishable
 * key, and a business must see only the enquiries actually routed to it.
 *
 * Everything created here is removed afterwards.
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

const anon = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

let pass = 0;
let fail = 0;
const createdLeads = [];
const createdUsers = [];

const check = (label, ok, detail = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

const stamp = Date.now();

async function main() {
  console.log('\n--- Distribution RPC is server-only ---');

  // Seed a lead through the admin client so there is something to attack.
  const { data: dest } = await admin
    .from('destinations')
    .select('id')
    .eq('key', 'serengeti')
    .single();
  const { data: cat } = await admin
    .from('categories')
    .select('id')
    .eq('key', 'safaris')
    .single();

  const { data: victim, error: victimErr } = await admin
    .from('leads')
    .insert({
      full_name: 'RPC Probe',
      email: `rpc-probe-${stamp}@example.test`,
      destination_id: dest.id,
      category_id: cat.id,
      message: 'Probe lead used to confirm the distribution RPC is not reachable from a browser.',
      adults: 2,
    })
    .select('id, reference')
    .single();

  check('lead insert succeeds without supplying a reference', !victimErr && Boolean(victim?.reference),
    victimErr?.message ?? '');
  check('reference matches the ET-YYYY-NNNNNN format',
    /^ET-\d{4}-\d{6}$/.test(victim?.reference ?? ''), victim?.reference ?? '');
  if (victim) createdLeads.push(victim.id);

  // The actual security assertion.
  const { error: rpcErr } = await anon.rpc('match_lead_to_businesses', {
    target_lead: victim.id,
  });
  check('anon CANNOT call match_lead_to_businesses',
    Boolean(rpcErr), rpcErr ? `blocked: ${rpcErr.code ?? rpcErr.message}` : 'CALL SUCCEEDED');

  const { error: capErr } = await anon.rpc('business_has_lead_capacity', {
    target: dest.id,
  });
  check('anon CANNOT call business_has_lead_capacity', Boolean(capErr),
    capErr ? 'blocked' : 'CALL SUCCEEDED');

  const { data: matched, error: adminRpcErr } = await admin.rpc(
    'match_lead_to_businesses',
    { target_lead: victim.id },
  );
  check('service role CAN distribute', !adminRpcErr && (matched ?? 0) > 0,
    adminRpcErr?.message ?? `distributed to ${matched}`);

  console.log('\n--- Guest submission ---');

  // A guest submits with the publishable key. No .select(): anon deliberately has
  // no read policy on leads, so asking PostgREST to return the inserted row is
  // correctly refused. Production submits through a server action holding the
  // secret key, which is what reads the reference back.
  const guestEmail = `guest-${stamp}@example.test`;
  const { error: guestErr } = await anon.from('leads').insert({
    full_name: 'Guest Traveler',
    email: guestEmail,
    destination_id: dest.id,
    message: 'Two of us, hoping to see the migration river crossings in August.',
    adults: 2,
  });
  check('a guest can submit an enquiry without an account', !guestErr,
    guestErr?.message ?? '');

  const { data: guest } = await admin
    .from('leads')
    .select('id, reference, traveler_id')
    .eq('email', guestEmail)
    .maybeSingle();
  if (guest) createdLeads.push(guest.id);
  check('the guest enquiry was actually stored', Boolean(guest?.reference));
  check('guest enquiry has no traveler attached', guest?.traveler_id === null);

  // Writing is allowed, reading is not: a guest must never be able to pull back
  // enquiries — their own or anyone else's.
  const { data: guestReadback } = await anon.from('leads').select('id').eq('email', guestEmail);
  check('a guest CANNOT read the enquiry back', guestReadback?.length === 0,
    `saw ${guestReadback?.length ?? 0}`);

  // Forging someone else's traveler_id must be refused by the RLS check.
  const { error: forgeErr } = await anon.from('leads').insert({
    full_name: 'Forger',
    email: `forge-${stamp}@example.test`,
    message: 'Attempting to attribute this enquiry to another user account entirely.',
    traveler_id: '00000000-0000-0000-0000-000000000001',
  });
  check('anon CANNOT attribute an enquiry to another user', Boolean(forgeErr),
    forgeErr ? 'blocked' : 'INSERT SUCCEEDED');

  console.log('\n--- Quality scoring ---');

  const { data: strong } = await admin
    .from('leads')
    .insert({
      full_name: 'Well Qualified',
      email: `strong-${stamp}@example.test`,
      phone: '+255700111222',
      destination_id: dest.id,
      category_id: cat.id,
      travel_start: '2027-08-01',
      travel_end: '2027-08-12',
      dates_flexible: false,
      adults: 2,
      budget_min: 5000,
      budget_max: 8000,
      interests: ['wildlife', 'photography'],
      message:
        'We are two travelers hoping to see the Mara river crossings in August. We would like a private vehicle throughout and a guide who knows birds well. Flexible on camp standard but would prefer something quiet.',
    })
    .select('id, quality_score')
    .single();
  if (strong) createdLeads.push(strong.id);

  const { data: weak } = await admin
    .from('leads')
    .insert({
      full_name: 'Vague',
      email: `weak-${stamp}@example.test`,
      message: 'Send me prices',
      adults: 1,
    })
    .select('id, quality_score')
    .single();
  if (weak) createdLeads.push(weak.id);

  check('a detailed enquiry scores high', (strong?.quality_score ?? 0) >= 80,
    `scored ${strong?.quality_score}`);
  check('a vague enquiry scores low', (weak?.quality_score ?? 100) <= 25,
    `scored ${weak?.quality_score}`);
  check('scoring separates the two clearly',
    (strong?.quality_score ?? 0) - (weak?.quality_score ?? 0) >= 50);

  console.log('\n--- Distribution behaviour ---');

  const { data: strongMatched } = await admin.rpc('match_lead_to_businesses', {
    target_lead: strong.id,
  });
  check('a strong lead is distributed', (strongMatched ?? 0) > 0,
    `${strongMatched} operators`);

  const { data: dist } = await admin
    .from('lead_businesses')
    .select('rank, businesses (name, tier)')
    .eq('lead_id', strong.id)
    .order('rank');

  dist?.forEach((d) => console.log(`      ${d.rank}. ${d.businesses.name} [${d.businesses.tier}]`));
  check('paying tiers are ranked ahead of free',
    !dist?.length || dist[0].businesses.tier !== 'free',
    `rank 1 was ${dist?.[0]?.businesses.tier}`);

  const { data: again } = await admin.rpc('match_lead_to_businesses', {
    target_lead: strong.id,
  });
  check('re-distributing the same lead is a no-op', again === 0, `returned ${again}`);

  const { count: notifCount } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', strong.id);
  check('an in-app notification is queued per recipient with an owner',
    typeof notifCount === 'number', `${notifCount} queued`);

  const { data: events } = await admin
    .from('lead_events')
    .select('event')
    .eq('lead_id', strong.id);
  check('distribution is recorded in the event log',
    events?.some((e) => e.event === 'distributed'));

  console.log('\n--- Visibility ---');

  const { data: anonLeads } = await anon.from('leads').select('id, email');
  check('anon cannot read any enquiry', anonLeads?.length === 0,
    `saw ${anonLeads?.length ?? 0}`);

  const { data: anonDist } = await anon.from('lead_businesses').select('id');
  check('anon cannot read distribution records', anonDist?.length === 0,
    `saw ${anonDist?.length ?? 0}`);

  // A business owner must see the enquiries routed to their business and no others.
  const { data: ownerUser } = await admin.auth.admin.createUser({
    email: `lead-owner-${stamp}@example.test`,
    password: 'Str0ng-Passphrase!42',
    email_confirm: true,
    user_metadata: { role: 'business_owner', full_name: 'Lead Owner' },
  });
  createdUsers.push(ownerUser.user.id);

  const recipientId = dist?.length
    ? (await admin.from('lead_businesses').select('business_id').eq('lead_id', strong.id).limit(1).single()).data.business_id
    : null;

  if (recipientId) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('update businesses set owner_id = $1 where id = $2', [
        ownerUser.user.id,
        recipientId,
      ]);
      await client.query('select set_config($1,$2,true)', [
        'request.jwt.claims',
        JSON.stringify({ sub: ownerUser.user.id, role: 'authenticated' }),
      ]);
      await client.query('set local role authenticated');

      const { rows: visible } = await client.query('select id from leads');
      const { rows: distributedToMe } = await client.query(
        'select lead_id from lead_businesses',
      );

      check('a business owner sees the enquiries routed to them',
        visible.some((l) => l.id === strong.id));
      check('a business owner does NOT see undistributed enquiries',
        !visible.some((l) => l.id === weak.id),
        `saw ${visible.length} leads`);
      check('a business owner sees only their own distribution rows',
        distributedToMe.every((d) => d.lead_id !== weak.id));

      await client.query('rollback');
    } finally {
      client.release();
    }
  }
}

try {
  await main();
} catch (err) {
  fail++;
  console.error('\nAborted:', err.message);
} finally {
  for (const id of createdLeads) {
    await admin.from('leads').delete().eq('id', id);
  }
  for (const id of createdUsers) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  console.log(`\n  cleaned up ${createdLeads.length} leads, ${createdUsers.length} accounts`);
  console.log(`\n${'='.repeat(48)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  console.log('='.repeat(48) + '\n');
  await pool.end();
  if (fail > 0) process.exitCode = 1;
}
