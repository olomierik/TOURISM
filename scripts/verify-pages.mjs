import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { pool } from './db.mjs';

/**
 * Assertions for the six pages that used to say "this section is being built".
 *
 * The one that matters most is the contact table. It holds the name, email
 * address and message of everyone who ever writes in, and the difference
 * between that being private and being a public mailing list is one policy.
 * A `using (true)` select on this table would be invisible in the UI and
 * catastrophic, so it is probed through the publishable key as the real anon
 * and authenticated roles rather than asserted from the migration file.
 *
 * The rest check that the pages have something to render: an about page whose
 * counts come out as zero, or a search that cannot reach any content type, is
 * the placeholder again wearing a different layout.
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

async function main() {
  console.log('\n--- Contact messages are not a public mailing list ---');

  // A real message to probe against, inserted with the service key so the test
  // is about reading rather than writing.
  const { rows: seeded } = await client.query(
    `insert into contact_messages (topic, name, email, message)
     values ('general', 'Probe Person', 'pages-probe@example.com',
             'A message long enough to satisfy the length constraint on this table.')
     returning id`,
  );
  const messageId = seeded[0].id;

  const anon = anonClient();
  const { data: anonReads } = await anon.from('contact_messages').select('id, email');
  check('a signed-out visitor reads nothing', (anonReads ?? []).length === 0,
    `${(anonReads ?? []).length} rows visible`);

  // A signed-in traveller is the more realistic attacker: they have a token.
  const email = `pages-probe-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const { data: made } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: 'Pages Probe', role: 'traveler' },
  });
  createdUsers.push(made.user.id);
  const member = anonClient();
  await member.auth.signInWithPassword({ email, password });

  const { data: memberReads } = await member.from('contact_messages').select('id, email');
  check('a signed-in non-admin reads nothing', (memberReads ?? []).length === 0,
    `${(memberReads ?? []).length} rows visible`);

  const upd = await member
    .from('contact_messages')
    .update({ handled_at: new Date().toISOString() })
    .eq('id', messageId);
  const { rows: untouched } = await client.query(
    'select handled_at from contact_messages where id = $1', [messageId]);
  check('a non-admin cannot mark one handled', untouched[0].handled_at === null,
    upd.error?.code ?? 'no error, but the row is unchanged');

  // Writing must work, or the form is decoration.
  const wrote = await anon.from('contact_messages').insert({
    topic: 'correction',
    name: 'Anon Probe',
    email: 'anon-probe@example.com',
    message: 'Anyone must be able to report that a price on this site is wrong.',
  });
  check('anyone can send a message', !wrote.error, wrote.error?.message?.slice(0, 50) ?? '');

  console.log('\n--- The table refuses what an admin cannot act on ---');

  const bad = async (over) =>
    Boolean(
      (
        await anon.from('contact_messages').insert({
          topic: 'general', name: 'Anon Probe',
          email: 'anon-probe@example.com',
          message: 'A perfectly reasonable message of sufficient length to pass.',
          ...over,
        })
      ).error,
    );

  check('a one-word message is refused', await bad({ message: 'hi' }));
  check('a malformed email is refused', await bad({ email: 'not-an-email' }));
  check('a one-character name is refused', await bad({ name: 'x' }));
  check('an unknown topic is refused', await bad({ topic: 'nonsense' }));

  console.log('\n--- The about page has numbers to show ---');

  const one = async (sql) => Number((await client.query(sql)).rows[0].n);
  const operators = await one(
    "select count(*) n from businesses where status='approved' and deleted_at is null");
  const destinations = await one(
    'select count(*) n from destinations where is_active and deleted_at is null');
  const seasonality = await one('select count(*) n from destination_seasonality');
  const guides = await one("select count(*) n from guides where status='published'");

  check('operators counted', operators > 0, `${operators}`);
  check('destinations counted', destinations > 0, `${destinations}`);
  check('seasonality counted', seasonality > 0, `${seasonality}`);
  check('guides counted', guides > 0, `${guides}`);

  // The page prints claimed and verified alongside the flattering numbers, so
  // they have to be countable even when they are small — and especially then.
  const claimed = await one(
    "select count(*) n from businesses where status='approved' and deleted_at is null and owner_id is not null");
  const verified = await one(
    "select count(*) n from businesses where status='approved' and deleted_at is null and verified_at is not null");
  check('claimed is a real count, not a placeholder', claimed >= 0 && claimed <= operators,
    `${claimed} of ${operators}`);
  check('verified is a real count', verified >= 0 && verified <= operators, `${verified}`);

  console.log('\n--- Search can reach every content type ---');

  for (const [label, table, column] of [
    ['destinations', 'destination_translations', 'name'],
    ['guides', 'guide_translations', 'title'],
    ['attractions', 'attraction_translations', 'name'],
    ['events', 'event_translations', 'name'],
    ['hidden gems', 'hidden_gem_translations', 'pitch'],
  ]) {
    const n = await one(
      `select count(*) n from ${table} where locale = 'en' and coalesce(${column}, '') <> ''`);
    check(`${label} are searchable in English`, n > 0, `${n} rows`);
  }

  // The one query the search page runs against a term that must match.
  const { rows: hit } = await client.query(
    `select count(*) n from destination_translations
      where locale = 'en' and name ilike '%serengeti%'`);
  check('a known term finds its destination', Number(hit[0].n) > 0);

  console.log('\n--- Compare has the columns it claims to compare ---');

  const { rows: cols } = await client.query(
    `select column_name from information_schema.columns where table_name = 'businesses'`);
  const have = new Set(cols.map((c) => c.column_name));
  for (const col of [
    'founded_year', 'rating_avg', 'rating_count', 'avg_response_minutes',
    'day_rate_low', 'day_rate_high', 'day_rate_currency',
  ]) {
    check(`businesses.${col} exists`, have.has(col));
  }
}

async function cleanup() {
  await client.query(
    `delete from contact_messages where email in ('pages-probe@example.com', 'anon-probe@example.com')`,
  ).catch(() => {});
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id).catch(() => {});
  const { data: left } = await admin.auth.admin.listUsers({ perPage: 200 });
  for (const u of left?.users ?? []) {
    if (u.email?.startsWith('pages-probe-')) await admin.auth.admin.deleteUser(u.id).catch(() => {});
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
