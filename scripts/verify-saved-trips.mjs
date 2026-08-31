import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { pool } from './db.mjs';

/**
 * Verification for saved trips.
 *
 * Everything that matters here runs through the publishable key as the real
 * `authenticated` role, because this is the first table on the site holding
 * user data rather than reference content. Written with the service key these
 * tests would pass whether or not a single policy existed — which is precisely
 * the failure they are here to catch. Two users are created and each one tries
 * to read and delete the other's trip.
 *
 * The second concern is a saved trip that quietly becomes a different trip. A
 * destination going away takes its stop with it, and a plan that silently loses
 * a stop is worse than one that says it has — so stop_count is checked to
 * actually record what was saved, and the cascade is checked to leave the
 * discrepancy visible rather than tidy it away.
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

const check = (label, ok, detail = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

async function makeUser() {
  const email = `trip-probe-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Trip Probe', role: 'traveler' },
  });
  if (error) throw new Error(`makeUser: ${error.message}`);
  createdUsers.push(data.user.id);

  const client = anonClient();
  const { error: sErr } = await client.auth.signInWithPassword({ email, password });
  if (sErr) throw new Error(`signIn: ${sErr.message}`);
  return { client, id: data.user.id };
}

/**
 * Saves through save_trip(), which is the only path the product uses.
 *
 * Writing the two inserts separately here — the way 037 originally allowed —
 * is what produced the stopless trip this suite caught, so the helper goes
 * through the function and the orphan case is tested deliberately below
 * instead of being created by accident everywhere.
 */
async function saveTrip(client, stops, over = {}) {
  const { data, error } = await client.rpc('save_trip', {
    p_name: 'Probe trip',
    p_style: 'midrange',
    p_travellers: 2,
    p_stops: stops.map((s) => ({ destination_id: s.id, nights: s.nights })),
    ...over,
  });
  return { id: data, error };
}

async function main() {
  const client = await pool.connect();

  // Two real destinations to point at.
  const { rows: dests } = await client.query(
    `select id from destinations where is_active and deleted_at is null limit 3`,
  );
  if (dests.length < 3) throw new Error('need three destinations');
  const [d1, d2, d3] = dests.map((d) => d.id);

  const alice = await makeUser();
  const bob = await makeUser();

  console.log('\n--- A trip saves, with its stops in order ---');

  const trip = await saveTrip(alice.client, [
    { id: d1, nights: 4 },
    { id: d2, nights: 2 },
  ]);
  check('a signed-in traveller can save a trip', !trip.error && Boolean(trip.id),
    trip.error?.message ?? '');

  const { data: readBack } = await alice.client
    .from('saved_trips')
    .select('id, stop_count, saved_trip_stops (nights, position)')
    .eq('id', trip.id)
    .single();
  check('it reads back with both stops', readBack?.saved_trip_stops?.length === 2);
  check('stop_count records what was saved', readBack?.stop_count === 2);
  check('positions are preserved',
    [...(readBack?.saved_trip_stops ?? [])].sort((a, b) => a.position - b.position)
      .map((s) => s.nights).join(',') === '4,2');

  // The exact select the account page runs. Nested embeds are the part of a
  // PostgREST query most likely to be silently wrong, and a bad relationship
  // name returns an error the page swallows into an empty list — which looks
  // identical to "you have no saved trips".
  const { data: pageShape, error: pageErr } = await alice.client
    .from('saved_trips')
    .select(
      `id, name, style, travellers, stop_count, created_at,
       saved_trip_stops (nights, position,
         destinations (is_active, deleted_at,
           destination_translations (locale, name, slug)))`,
    )
    .order('created_at', { ascending: false });

  check('the account page query resolves', !pageErr, pageErr?.message ?? '');
  check('it returns the trip with its stops',
    (pageShape ?? []).length === 1 && pageShape[0].saved_trip_stops.length === 2,
    `${(pageShape ?? []).length} trip(s)`);
  check('each stop reaches a translated destination name',
    (pageShape ?? [])[0]?.saved_trip_stops?.every((st) =>
      (st.destinations?.destination_translations ?? []).some(
        (tr) => tr.locale === 'en' && tr.name,
      ),
    ) === true);

  console.log('\n--- Nobody else can see it, and nobody else can delete it ---');

  const { data: bobSees } = await bob.client.from('saved_trips').select('id');
  check('another traveller sees none of it', (bobSees ?? []).length === 0,
    `${(bobSees ?? []).length} rows visible`);

  const { data: bobStops } = await bob.client.from('saved_trip_stops').select('id');
  check('nor any of its stops', (bobStops ?? []).length === 0);

  // Delete under RLS returns success with zero rows affected rather than an
  // error, so the check is that the row survives.
  await bob.client.from('saved_trips').delete().eq('id', trip.id);
  const { count: stillThere } = await alice.client
    .from('saved_trips')
    .select('id', { count: 'exact', head: true })
    .eq('id', trip.id);
  check('another traveller cannot delete it', stillThere === 1);

  const { data: anonSees } = await anonClient().from('saved_trips').select('id');
  check('a signed-out visitor sees nothing', (anonSees ?? []).length === 0);

  // The one that would matter most if a policy were written with `using (true)`.
  const forged = await alice.client
    .from('saved_trips')
    .insert({ profile_id: bob.id, style: 'midrange', travellers: 2, stop_count: 1 })
    .select('id');
  check('a forged profile_id is refused', Boolean(forged.error),
    forged.error?.code ?? 'INSERT SUCCEEDED');

  console.log('\n--- A trip cannot exist without stops ---');

  // The window 038 closed. A parent-only insert is exactly what a determined
  // client with the publishable key would send, and what the suite's own
  // helper used to do between two requests.
  const stopless = await alice.client
    .from('saved_trips')
    .insert({ profile_id: alice.id, style: 'midrange', travellers: 2, stop_count: 1 })
    .select('id');
  check('a trip inserted without stops is rejected at commit', Boolean(stopless.error),
    stopless.error?.message?.slice(0, 60) ?? 'INSERT SUCCEEDED');

  const empty = await alice.client.rpc('save_trip', {
    p_name: '', p_style: 'midrange', p_travellers: 2, p_stops: [],
  });
  check('save_trip refuses an empty stop list', Boolean(empty.error));

  const anonSave = await anonClient().rpc('save_trip', {
    p_name: '', p_style: 'midrange', p_travellers: 2,
    p_stops: [{ destination_id: d1, nights: 2 }],
  });
  check('a signed-out caller cannot save', Boolean(anonSave.error),
    anonSave.error?.code ?? 'RPC SUCCEEDED');

  const unnamed = await alice.client.rpc('save_trip', {
    p_name: '   ', p_style: 'midrange', p_travellers: 2,
    p_stops: [{ destination_id: d2, nights: 2 }],
  });
  check('a blank name saves as unnamed rather than failing', !unnamed.error,
    unnamed.error?.message?.slice(0, 60) ?? '');
  if (unnamed.data) {
    const { data: row } = await alice.client
      .from('saved_trips').select('name').eq('id', unnamed.data).single();
    check('and is stored as null, not as an empty string', row?.name === null, String(row?.name));
    await alice.client.from('saved_trips').delete().eq('id', unnamed.data);
  }

  console.log('\n--- Nonsense cannot be stored ---');

  // Through the function, so a rejection is the column constraint doing its
  // job rather than the require-stops trigger catching everything.
  const bad = async (over) =>
    Boolean(
      (
        await alice.client.rpc('save_trip', {
          p_name: 'Probe trip',
          p_style: 'midrange',
          p_travellers: 2,
          p_stops: [{ destination_id: d1, nights: 2 }],
          ...over,
        })
      ).error,
    );

  check('an unknown style is refused', await bad({ p_style: 'platinum' }));
  check('zero travellers is refused', await bad({ p_travellers: 0 }));
  check('twenty-one travellers is refused', await bad({ p_travellers: 21 }));

  const dupPos = await saveTrip(alice.client, [
    { id: d1, nights: 2 },
    { id: d1, nights: 3 },
  ]);
  check('the same destination cannot appear twice in one trip', Boolean(dupPos.error),
    dupPos.error?.code ?? 'INSERT SUCCEEDED');

  console.log('\n--- A vanished destination is visible, not silent ---');

  const t2 = await saveTrip(alice.client, [
    { id: d1, nights: 3 },
    { id: d3, nights: 2 },
  ]);

  // Simulated with a temporary destination rather than by deleting a real one.
  const { rows: tmp } = await client.query(
    `insert into destinations (key, country_code, is_active)
     values ('trip-probe-' || substr(md5(random()::text), 1, 8), 'TZ', true)
     returning id`,
  );
  const t3 = await saveTrip(alice.client, [
    { id: d1, nights: 3 },
    { id: tmp[0].id, nights: 2 },
  ]);
  check('a trip with a soon-to-vanish stop saves', !t3.error);

  await client.query('delete from destinations where id = $1', [tmp[0].id]);

  const { data: after } = await alice.client
    .from('saved_trips')
    .select('stop_count, saved_trip_stops (id)')
    .eq('id', t3.id)
    .single();
  check('the stop is gone with the destination', after?.saved_trip_stops?.length === 1);
  check('but stop_count still says two, so the page can say one is missing',
    after?.stop_count === 2,
    `${after?.saved_trip_stops?.length} of ${after?.stop_count} remain`);

  console.log('\n--- Deleting a trip takes its stops ---');

  const { rows: before } = await client.query(
    'select count(*) n from saved_trip_stops where trip_id = $1', [t2.id],
  );
  await alice.client.from('saved_trips').delete().eq('id', t2.id);
  const { rows: gone } = await client.query(
    'select count(*) n from saved_trip_stops where trip_id = $1', [t2.id],
  );
  check('stops cascade with the trip',
    Number(before[0].n) === 2 && Number(gone[0].n) === 0,
    `${before[0].n} → ${gone[0].n}`);

  console.log('\n--- The table holds no orphans ---');

  const { rows: orphans } = await client.query(
    `select count(*) n from saved_trips t
      where not exists (select 1 from saved_trip_stops s where s.trip_id = t.id)`,
  );
  check('no saved trip has zero stops', Number(orphans[0].n) === 0,
    `${orphans[0].n} — one would open on nothing`);

  const { rows: pub } = await client.query(
    `select count(*) n from pg_policies
      where tablename in ('saved_trips', 'saved_trip_stops')
        and 'anon' = any (string_to_array(replace(roles::text, '{', ''), ','))`,
  );
  check('neither table grants anything to anon', Number(pub[0].n) === 0);

  client.release();
  await pool.end();
}

async function cleanup() {
  for (const id of createdUsers) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  const { data: leftovers } = await admin.auth.admin.listUsers({ perPage: 200 });
  for (const u of leftovers?.users ?? []) {
    if (u.email?.startsWith('trip-probe-')) {
      await admin.auth.admin.deleteUser(u.id).catch(() => {});
    }
  }
  await admin.from('destinations').delete().like('key', 'trip-probe-%');
  console.log(`\n  cleaned up ${createdUsers.length} accounts`);
}

try {
  await main();
} catch (err) {
  fail++;
  console.error('\nAborted:', err.message);
} finally {
  await cleanup();
  console.log('\n' + '='.repeat(50));
  console.log(`  ${pass} passed, ${fail} failed`);
  console.log('='.repeat(50) + '\n');
  if (fail > 0) process.exitCode = 1;
}
