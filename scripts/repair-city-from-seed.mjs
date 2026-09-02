import { readFileSync, readdirSync } from 'node:fs';

import { pool } from './db.mjs';

/**
 * Puts back the city values migration 050 should not have cleared.
 *
 *   node scripts/repair-city-from-seed.mjs [--dry]
 *
 * 050 cleared any city whose name matched a destination, reasoning that a camp
 * whose addr:city says "Serengeti National Park" is not in a city. That part
 * was right. What it missed is that most destinations on this site *are*
 * cities — Arusha, Dar es Salaam, Tanga, Zanzibar, Mombasa, Kigali, Kampala,
 * Entebbe, Lamu — so the rule also erased the city of every listing in them.
 * 61 listings in Dar es Salaam and 23 in Arusha lost the only field that says
 * where they are.
 *
 * The seed files still hold what each import read, so the value is recoverable
 * rather than lost. This restores it wherever the column is now null, and only
 * where the source actually had one — it never invents a city for a listing
 * that never had one.
 *
 * Park names are not restored, because clearing those was correct: the
 * destination link already says a camp is in the Serengeti, and that is the
 * field for it.
 */

const DRY = process.argv.includes('--dry');

/**
 * Names that are a place on the map but not a town somebody lives in. Matched
 * against the seed's own city value, so a genuine city that shares a
 * destination name — which is most of them — comes back.
 */
const NOT_A_SETTLEMENT =
  /(national park|game reserve|conservation|crater|mountain|mount |lake |island|beach|gate|wildlife|forest)/i;

const COUNTRIES = new Set(['tanzania', 'kenya', 'uganda', 'rwanda']);

const files = readdirSync('supabase/seed').filter((f) =>
  /^operators-(gmaps|osm)-.+\.json$/.test(f),
);

/**
 * The seed files hold what the mapper typed, which is where 'Dar es salaaam'
 * came from. Restoring the raw value put that spelling straight back after
 * migration 050 had removed it, so the same correction migration 051 applies
 * in SQL is applied here — otherwise the repair and the migration undo each
 * other and whichever ran last decides what the directory says.
 */
function canonical(city) {
  if (/^dar\s*es\s*sala+a*m$/i.test(city.replace(/[^a-z\s]/gi, ''))) return 'Dar es Salaam';
  return city;
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** slug -> city, from every seed file that carries one. */
const cityBySlug = new Map();
for (const file of files) {
  const data = JSON.parse(readFileSync(`supabase/seed/${file}`, 'utf8'));
  for (const p of data.places ?? []) {
    if (!p.name || !p.city) continue;
    const city = canonical(String(p.city).trim());
    if (!city) continue;
    if (NOT_A_SETTLEMENT.test(city)) continue;
    if (COUNTRIES.has(city.toLowerCase())) continue;
    const slug = slugify(p.name);
    if (slug) cityBySlug.set(slug, city);
  }
}

console.log(`\n  ${files.length} seed file(s), ${cityBySlug.size} slugs carrying a city\n`);

const client = await pool.connect();
let restored = 0;
let unchanged = 0;

try {
  await client.query('begin');
  await client.query("set local statement_timeout = '600s'");

  const { rows } = await client.query(
    `select id, slug from businesses where deleted_at is null and city is null`,
  );
  console.log(`  ${rows.length} listings currently have no city`);

  // One statement, not one per row: the pooler is on another continent and a
  // round trip each would take longer than the import that caused this.
  const pairs = rows
    .map((r) => [r.id, cityBySlug.get(r.slug)])
    .filter(([, city]) => Boolean(city));

  if (pairs.length) {
    const values = pairs.map((_, i) => `($${i * 2 + 1}::uuid, $${i * 2 + 2}::text)`).join(',');
    const { rowCount } = await client.query(
      `update businesses b set city = v.city
         from (values ${values}) as v(id, city)
        where b.id = v.id`,
      pairs.flat(),
    );
    restored = rowCount;
  }
  unchanged = rows.length - pairs.length;

  if (DRY) {
    await client.query('rollback');
    console.log('\n  DRY RUN — rolled back');
  } else {
    await client.query('commit');
  }
} catch (err) {
  await client.query('rollback');
  console.error(`\n  Rolled back: ${err.message}`);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

console.log(`\n  restored          ${restored}`);
console.log(`  left without one  ${unchanged}  (the seed had none either)\n`);
