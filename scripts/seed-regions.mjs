import { readFileSync } from 'node:fs';
import { query, pool } from './db.mjs';

/**
 * Loads simplified region boundaries and files every listing under one.
 *
 *   node scripts/seed-regions.mjs [--dry]
 *
 * Idempotent: re-running replaces the boundaries and recomputes every region.
 */

const DRY = process.argv.includes('--dry');

/**
 * OpenStreetMap's name for a region, where it differs from ours.
 *
 * Zanzibar is the whole list. OSM uses the Swahili names and the taxonomy in
 * 023 uses the English ones, and both are correct — 'Unguja Kaskazini' and
 * 'Zanzibar North' are the same place. Mapping them here rather than renaming
 * either side keeps OSM's names matching OSM and ours matching the URLs and
 * page copy people have already seen.
 */
const ALIASES = new Map([
  ['unguja mjini magharibi', 'mjini magharibi'],
  ['unguja kaskazini', 'zanzibar north'],
  ['unguja kusini', 'zanzibar central/south'],
  ['kaskazini pemba', 'pemba north'],
  ['kusini pemba', 'pemba south'],
  ['city of kigali', 'kigali'],
]);

/**
 * Drops the administrative suffix so 'Northern Region' matches 'Northern', and
 * flattens the punctuation the two sources disagree about: OSM writes 'Taita
 * Taveta' and 'Murang`a' where the taxonomy writes 'Taita-Taveta' and
 * 'Murang'a'. Same counties, different keyboards.
 */
const normalise = (name) =>
  name
    .toLowerCase()
    .replace(/\s+(region|county|province|district|city)$/, '')
    .replace(/[`'’-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const key = (name) => {
  const n = normalise(name);
  return ALIASES.get(n) ?? n;
};

/** Postgres polygon literal: ((x1,y1),(x2,y2),…). */
const toPolygon = (ring) => `(${ring.map(([lon, lat]) => `(${lon},${lat})`).join(',')})`;

const gazetteer = JSON.parse(readFileSync('supabase/seed/regions.json', 'utf8'));

const taxonomy = (await query('select id, country_code, name from regions')).rows;
const byKey = new Map(taxonomy.map((r) => [`${r.country_code}:${key(r.name)}`, r]));

const matched = [];
const unmatched = [];

for (const region of gazetteer.regions) {
  const row = byKey.get(`${region.countryCode}:${key(region.name)}`);
  if (row) matched.push({ region, row });
  else unmatched.push(region);
}

console.log(`\n  gazetteer   ${gazetteer.regions.length} regions`);
console.log(`  taxonomy    ${taxonomy.length} regions`);
console.log(`  matched     ${matched.length}`);

if (unmatched.length) {
  // Expected: one South Sudanese state that Overpass returns for the Kenyan
  // query because the two countries share a boundary relation. Anything else
  // in this list is a real gap and worth looking at, which is why it prints
  // rather than being silently dropped.
  console.log(`  no taxonomy row (${unmatched.length}):`);
  for (const r of unmatched) console.log(`    ${r.countryCode}  ${r.name}`);
}

const covered = new Set(matched.map((m) => m.row.id));
const missing = taxonomy.filter((r) => !covered.has(r.id));
if (missing.length) {
  console.log(`  no boundary (${missing.length}):`);
  for (const r of missing) console.log(`    ${r.country_code}  ${r.name}`);
}

if (DRY) {
  console.log('\n  --dry, nothing written\n');
  await pool.end();
  process.exit(0);
}

// One transaction: a half-loaded gazetteer would file listings under whichever
// regions happened to make it in, and that is worse than not running at all.
await query('begin');
try {
  await query('delete from region_boundaries');

  let rings = 0;
  for (const { region, row } of matched) {
    for (const ring of region.rings) {
      await query('insert into region_boundaries (region_id, boundary) values ($1, $2::polygon)', [
        row.id,
        toPolygon(ring),
      ]);
      rings++;
    }
  }
  console.log(`\n  loaded      ${rings} rings`);

  // Recompute directly rather than by nudging the trigger: one statement over
  // the whole table, and it says plainly what it is doing.
  const updated = await query(`
    update businesses
       set region_id = region_for_point(latitude, longitude, country_code)
     where region_locked = false
    returning region_id
  `);

  const filed = updated.rows.filter((r) => r.region_id).length;
  console.log(`  classified  ${filed} of ${updated.rowCount} listings`);

  await query('commit');
} catch (err) {
  await query('rollback');
  console.error(`\n  FAILED, rolled back: ${err.message}\n`);
  await pool.end();
  process.exit(1);
}

// What the filter will actually look like to somebody using it.
const summary = await query(`
  select r.country_code,
         count(distinct r.id) filter (where b.n > 0) as regions_with_listings,
         count(distinct r.id)                        as regions_total,
         coalesce(sum(b.n), 0)                       as listings
    from regions r
    left join (
      select region_id, count(*) n from businesses
       where status = 'approved' and region_id is not null
       group by region_id
    ) b on b.region_id = r.id
   group by r.country_code
   order by listings desc
`);

console.log('\n  country   regions used   listings filed');
for (const r of summary.rows) {
  console.log(
    `  ${r.country_code}        ${String(r.regions_with_listings).padStart(3)} of ${String(r.regions_total).padEnd(4)}   ${r.listings}`,
  );
}

const unfiled = await query(`
  select count(*) n from businesses
   where status = 'approved' and region_id is null
`);
console.log(`\n  unfiled     ${unfiled.rows[0].n} approved listings\n`);

await pool.end();
