import { pool } from './db.mjs';
import { ATTRACTIONS } from '../supabase/seed/attractions.mjs';

/**
 * Publishes the things-to-do entries.
 *
 * Idempotent on the attraction key, so editing the seed file and re-running is
 * the workflow — the same as the guide and seasonality seeders.
 *
 * English only for now, by decision: publish in English, translate what earns
 * traffic. The translation table already takes a slug per locale, so a German
 * version is a row rather than a migration.
 *
 * A destination key that does not exist is reported rather than skipped. That
 * is the failure this codebase keeps producing — content written for a place
 * that was renamed, landing nowhere, with the run still reporting success.
 */

const client = await pool.connect();
let wrote = 0;
const unknown = [];

/** A URL-safe slug from the name, matching the destination seeders' rules. */
function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

try {
  const { rows: dests } = await client.query(
    `select d.id, d.key from destinations d where d.is_active and d.deleted_at is null`,
  );
  const byKey = new Map(dests.map((d) => [d.key, d.id]));

  for (const a of ATTRACTIONS) {
    const destinationId = byKey.get(a.destination);
    if (!destinationId) {
      unknown.push(`${a.key} -> ${a.destination}`);
      continue;
    }

    await client.query('begin');

    const { rows: saved } = await client.query(
      `insert into attractions
         (key, destination_id, kind, latitude, longitude, is_free, typical_minutes, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (key) do update set
         destination_id  = excluded.destination_id,
         kind            = excluded.kind,
         latitude        = excluded.latitude,
         longitude       = excluded.longitude,
         is_free         = excluded.is_free,
         typical_minutes = excluded.typical_minutes,
         sort_order      = excluded.sort_order,
         is_active       = true
       returning id`,
      [
        a.key,
        destinationId,
        a.kind,
        a.lat ?? null,
        a.lng ?? null,
        a.isFree ?? null,
        a.minutes ?? null,
        a.sort ?? 100,
      ],
    );

    await client.query(
      `insert into attraction_translations (attraction_id, locale, name, slug, summary, tip)
       values ($1,'en',$2,$3,$4,$5)
       on conflict (attraction_id, locale) do update set
         name = excluded.name, slug = excluded.slug,
         summary = excluded.summary, tip = excluded.tip`,
      [saved[0].id, a.name, slugify(a.name) + '-' + a.destination, a.summary ?? null, a.tip ?? null],
    );

    await client.query('commit');
    wrote += 1;
    process.stdout.write(`  ${a.destination.padEnd(38)} ${a.name}\n`);
  }

  console.log(`\n  ${wrote} things to do across ${new Set(ATTRACTIONS.map((a) => a.destination)).size} destinations.`);
  if (unknown.length) {
    console.log('\n  DESTINATION KEY NOT FOUND — these were not written:');
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
