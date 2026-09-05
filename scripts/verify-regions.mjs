import { readFileSync } from 'node:fs';
import { query, pool } from './db.mjs';

/**
 * Checks that listings are filed under the right region.
 *
 *   npm run db:verify:regions
 *
 * Reads only. Runs no fixtures, writes nothing, and is safe against production.
 *
 * The interesting check is the third one. 609 Tanzanian listings carry a region
 * that Google recorded when they were crawled, which is ground truth this
 * project did not produce and cannot bend — so it is worth more than any
 * assertion written alongside the code it is testing.
 */

let failures = 0;
let checks = 0;

function check(label, ok, detail = '') {
  checks++;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
}

// ---------------------------------------------------------------------------
// The boundaries loaded, and every region in the taxonomy has one.
// ---------------------------------------------------------------------------
const boundaries = await query(`
  select count(*)::int as rings, count(distinct region_id)::int as regions
    from region_boundaries
`);
const taxonomy = await query('select count(*)::int as n from regions');

check(
  'every region has at least one boundary',
  boundaries.rows[0].regions === taxonomy.rows[0].n,
  `${boundaries.rows[0].regions} of ${taxonomy.rows[0].n}, ${boundaries.rows[0].rings} rings`,
);

// ---------------------------------------------------------------------------
// Every listing that can be filed, is.
//
// A listing with no coordinates cannot be placed and is not a failure; one
// with coordinates and no region means the boundaries have a hole in them.
// ---------------------------------------------------------------------------
const coverage = await query(`
  select
    count(*) filter (where latitude is not null)                         as placeable,
    count(*) filter (where latitude is not null and region_id is null)   as unfiled,
    count(*) filter (where latitude is null)                             as no_coords
  from businesses
  where status = 'approved' and deleted_at is null
`);
const { placeable, unfiled, no_coords: noCoords } = coverage.rows[0];

check(
  'every listing with coordinates has a region',
  Number(unfiled) === 0,
  `${Number(placeable) - Number(unfiled)} of ${placeable} filed, ${noCoords} have no coordinates`,
);

// ---------------------------------------------------------------------------
// Against Google's own answer.
// ---------------------------------------------------------------------------
const seed = JSON.parse(readFileSync('supabase/seed/operators-gmaps-TZ.json', 'utf8'));
const truth = seed.places.filter((p) => p.region && p.lat != null);

// One round trip rather than 609. The coordinates are sent as arrays and
// unnested, so the whole comparison is a single query.
const compared = await query(
  `
  with given as (
    select * from unnest($1::float8[], $2::float8[], $3::text[]) as t(lat, lng, expected)
  )
  select
    count(*)::int                                              as total,
    count(*) filter (where r.name is null)::int                as unassigned,
    count(*) filter (where r.name is not null
                       and lower(r.name) = lower(g.expected))::int as agreed
  from given g
  left join regions r on r.id = region_for_point(g.lat, g.lng, 'TZ')
`,
  [
    truth.map((p) => p.lat),
    truth.map((p) => p.lng),
    // 'Arusha Region' is how Google writes what this database calls 'Arusha'.
    truth.map((p) => p.region.replace(/\s+Region$/i, '').trim()),
  ],
);

const { total, agreed, unassigned } = compared.rows[0];
const accuracy = total ? (agreed / total) * 100 : 0;

check(
  'agrees with Google on at least 99% of known regions',
  accuracy >= 99,
  `${agreed} of ${total} (${accuracy.toFixed(1)}%), ${unassigned} unassigned`,
);

// ---------------------------------------------------------------------------
// Places that must resolve, including the ones that caught real bugs.
//
// Stone Town and Mafia Island are here because they both failed during
// development: a fixed simplification tolerance moved Zanzibar's west coast
// inland past Stone Town, and keeping only each region's largest landmass
// dropped Mafia Island into the sea. Neither would have been noticed by a
// count of how many listings got filed.
// ---------------------------------------------------------------------------
const LANDMARKS = [
  ['Arusha town', -3.3689, 36.6829, 'TZ', 'Arusha'],
  ['Serengeti', -2.3333, 34.8333, 'TZ', 'Mara'],
  ['Stone Town', -6.1659, 39.1988, 'TZ', 'Mjini Magharibi'],
  ['Nungwi', -5.7262, 39.2947, 'TZ', 'Zanzibar North'],
  ['Mafia Island', -7.9022, 39.7712, 'TZ', 'Pwani'],
  ['Moshi', -3.3486, 37.3411, 'TZ', 'Kilimanjaro'],
  ['Nairobi', -1.2921, 36.8219, 'KE', 'Nairobi'],
  ['Diani Beach', -4.2797, 39.5906, 'KE', 'Kwale'],
  ['Kampala', 0.3476, 32.5825, 'UG', 'Central'],
  ['Kigali', -1.9403, 30.0644, 'RW', 'Kigali'],
];

for (const [label, lat, lng, country, expected] of LANDMARKS) {
  const { rows } = await query(
    'select r.name from regions r where r.id = region_for_point($1, $2, $3)',
    [lat, lng, country],
  );
  const got = rows[0]?.name ?? null;
  check(`${label} is in ${expected}`, got === expected, got ?? 'no region');
}

// ---------------------------------------------------------------------------
// Near-me returns more than tour operators.
//
// The complaint this was built for. Measured from Arusha, so it fails loudly
// if a future change narrows near-me back to one category.
// ---------------------------------------------------------------------------
const kinds = await query('select count(*)::int as n from categories_near(-3.3689, 36.6829, 50)');
check(
  'near-me finds several kinds of business',
  kinds.rows[0].n >= 4,
  `${kinds.rows[0].n} categories within 50km of Arusha`,
);

console.log(`\n  ${checks - failures} of ${checks} checks passed\n`);
await pool.end();
process.exit(failures ? 1 : 0);
