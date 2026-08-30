import { readFileSync } from 'node:fs';
import { pool } from './db.mjs';
import {
  TRACK_EVENTS,
  LOCALES,
  isTrackEvent,
  safeProps,
  safePath,
  localeFromPath,
} from '../lib/analytics/sanitize.ts';

/**
 * Assertions for the product event pipeline.
 *
 * /api/events is an unauthenticated write endpoint reachable by anyone who can
 * open the site. Most of what follows is about what it refuses: a validator on
 * a public write path is the one that has to be proved rather than trusted.
 *
 * The other half is drift. The event names live in three places — a Postgres
 * enum, a TypeScript union and this list — and a name that exists in one but
 * not the others is a metric that silently reports zero forever. That is the
 * same failure shape as the empty tables this project keeps finding, so it is
 * asserted rather than remembered.
 */

let passed = 0;
let failed = 0;

function check(label, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const client = await pool.connect();

try {
  const one = async (sql, params = []) => (await client.query(sql, params)).rows[0];

  console.log('\n--- The event names agree across all three definitions ---');

  const { rows: enumRows } = await client.query(
    `select e.enumlabel v from pg_enum e
       join pg_type t on t.oid = e.enumtypid
      where t.typname = 'analytics_event'
      order by e.enumsortorder`,
  );
  const inDb = enumRows.map((r) => r.v);

  check('the database enum has the same count as the code',
    inDb.length === TRACK_EVENTS.length, `${inDb.length} vs ${TRACK_EVENTS.length}`);

  const missingInCode = inDb.filter((v) => !TRACK_EVENTS.includes(v));
  const missingInDb = TRACK_EVENTS.filter((v) => !inDb.includes(v));
  check('every database value exists in the code', missingInCode.length === 0,
    missingInCode.join(', ') || 'none missing');
  check('every code value exists in the database', missingInDb.length === 0,
    missingInDb.join(', ') || 'none missing');

  // The events the brief named. Losing one of these silently is the whole risk.
  for (const required of [
    'search_started', 'business_viewed', 'whatsapp_clicked',
    'quote_submitted', 'trip_planner_completed', 'save_clicked',
  ]) {
    check(`${required} is recordable`, inDb.includes(required) && isTrackEvent(required));
  }

  check('an invented event name is refused', isTrackEvent('free_money') === false);
  check('a non-string event is refused', isTrackEvent(42) === false);

  console.log('\n--- Props are bounded, because anyone can post them ---');

  check('a normal payload survives',
    JSON.stringify(safeProps({ slug: 'serengeti', adults: 3, flexible: true })) ===
      JSON.stringify({ slug: 'serengeti', adults: 3, flexible: true }));

  const many = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`k${i}`, i]));
  check('no more than twelve keys are kept',
    Object.keys(safeProps(many)).length === 12, `${Object.keys(safeProps(many)).length}`);

  check('an over-long string is dropped, not truncated',
    safeProps({ note: 'x'.repeat(200) }).note === undefined);
  check('a nested object is dropped',
    safeProps({ nested: { a: 1 } }).nested === undefined);
  check('an array is dropped', safeProps({ list: [1, 2, 3] }).list === undefined);
  check('a key with punctuation is dropped',
    safeProps({ 'drop--me': 1 })['drop--me'] === undefined);
  check('NaN is dropped rather than stored', safeProps({ n: NaN }).n === undefined);
  check('null and undefined are dropped',
    Object.keys(safeProps({ a: null, b: undefined })).length === 0);
  check('a top-level array yields nothing',
    Object.keys(safeProps([1, 2, 3])).length === 0);
  check('a string payload yields nothing', Object.keys(safeProps('hello')).length === 0);
  check('null yields nothing', Object.keys(safeProps(null)).length === 0);

  console.log('\n--- Paths and locales ---');

  // LOCALES is copied into the sanitiser rather than imported, so it stays
  // testable from here. This is the guard that keeps the copy honest.
  const routing = readFileSync('i18n/routing.ts', 'utf8');
  const declared = [...new Set([...routing.matchAll(/'(en|de|fr|it)'/g)].map((m) => m[1]))];
  check('the sanitiser locale list matches i18n/routing',
    declared.length === LOCALES.length && LOCALES.every((l) => declared.includes(l)),
    `${LOCALES.join(',')} vs ${declared.join(',')}`);

  check('an absolute path is kept', safePath('/business/x') === '/business/x');
  check('an off-site URL is refused', safePath('https://evil.test/x') === null);
  check('a relative path is refused', safePath('business/x') === null);
  check('an enormous path is refused', safePath('/' + 'a'.repeat(600)) === null);

  check('a German path reads as de', localeFromPath('/de/anbieter/x') === 'de');
  check('a French path reads as fr', localeFromPath('/fr/prestataire/x') === 'fr');
  check('an unprefixed path reads as en', localeFromPath('/business/x') === 'en');
  check('the bare root reads as en', localeFromPath('/') === 'en');
  check('an unknown prefix falls back to en', localeFromPath('/zz/thing') === 'en');
  check('a null path has no locale', localeFromPath(null) === null);

  console.log('\n--- The table is write-only from the browser ---');

  const rls = await one(
    `select relrowsecurity r from pg_class where relname = 'analytics_events'`,
  );
  check('RLS is enabled', rls?.r === true);

  const { rows: pol } = await client.query(
    `select polname, polcmd, pg_get_expr(polqual, polrelid) q
       from pg_policy where polrelid = 'analytics_events'::regclass`,
  );
  const insertPolicies = pol.filter((p) => p.polcmd === 'a');
  const selectPolicies = pol.filter((p) => p.polcmd === 'r');

  check('anyone may insert', insertPolicies.length === 1,
    insertPolicies.map((p) => p.polname).join(', '));
  check('reading is admin-only',
    selectPolicies.length === 1 && /is_admin/.test(selectPolicies[0].q ?? ''),
    selectPolicies.map((p) => p.polname).join(', ') || 'none');

  console.log('\n--- Nothing identifying is stored ---');

  const { rows: cols } = await client.query(
    `select column_name from information_schema.columns
      where table_name = 'analytics_events'`,
  );
  const names = cols.map((c) => c.column_name);
  for (const forbidden of ['email', 'ip_address', 'full_name', 'phone', 'user_agent']) {
    check(`there is no ${forbidden} column`, !names.includes(forbidden));
  }
  check('the visitor is a hash, not an id', names.includes('visitor_hash'));
  check('every event carries a locale for the language-market split',
    names.includes('locale'));
} catch (err) {
  failed += 1;
  console.error('\n  suite error:', err.message);
} finally {
  // Rows written by a direct probe against a dev server, never by a visitor.
  await client.query(
    `delete from analytics_events where props->>'slug' = 'probe'`,
  );
  client.release();
  await pool.end();
}

console.log('\n==================================================');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('==================================================\n');
process.exitCode = failed > 0 ? 1 : 0;
