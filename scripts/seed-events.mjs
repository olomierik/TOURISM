import { pool } from './db.mjs';
import { EVENTS } from '../supabase/seed/events.mjs';

/**
 * Publishes the events.
 *
 * Idempotent on key, so editing the seed file and re-running is the workflow.
 *
 * Never writes next_start or next_end. Those are the confirmed dates of a real
 * edition and belong to whoever checked with the organiser — a seeder that
 * invented them would be the most expensive kind of wrong on this site.
 */
const client = await pool.connect();
let wrote = 0;
const unknown = [];

function slugify(v) {
  return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

try {
  const { rows: dests } = await client.query(
    `select id, key from destinations where is_active and deleted_at is null`,
  );
  const byKey = new Map(dests.map((d) => [d.key, d.id]));

  for (const e of EVENTS) {
    const destinationId = e.destination ? byKey.get(e.destination) : null;
    if (e.destination && !destinationId) {
      unknown.push(`${e.key} -> ${e.destination}`);
      continue;
    }

    await client.query('begin');
    const { rows: saved } = await client.query(
      `insert into events (key, destination_id, country_code, kind, is_annual, typical_month, organiser, website)
       values ($1,$2,$3,$4,true,$5,$6,$7)
       on conflict (key) do update set
         destination_id = excluded.destination_id,
         country_code   = excluded.country_code,
         kind           = excluded.kind,
         typical_month  = excluded.typical_month,
         organiser      = excluded.organiser,
         website        = excluded.website,
         is_active      = true
       returning id`,
      [e.key, destinationId, e.country, e.kind, e.month, e.organiser ?? null, e.website ?? null],
    );

    await client.query(
      `insert into event_translations (event_id, locale, name, slug, summary, advice)
       values ($1,'en',$2,$3,$4,$5)
       on conflict (event_id, locale) do update set
         name = excluded.name, slug = excluded.slug,
         summary = excluded.summary, advice = excluded.advice`,
      [saved[0].id, e.name, slugify(e.name), e.summary ?? null, e.advice ?? null],
    );
    await client.query('commit');

    wrote += 1;
    process.stdout.write(`  ${String(e.month).padStart(2)}  ${e.country}  ${e.name}\n`);
  }

  console.log(`\n  ${wrote} events across ${new Set(EVENTS.map((e) => e.country)).size} countries.`);
  console.log('  No confirmed dates written — those are set by an admin once an organiser announces.');
  if (unknown.length) {
    console.log('\n  DESTINATION NOT FOUND:');
    unknown.forEach((u) => console.log(`    ${u}`));
    process.exitCode = 1;
  }
} catch (err) {
  await client.query('rollback').catch(() => {});
  console.error('\n  Failed:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
