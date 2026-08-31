import { pool } from './db.mjs';

/**
 * Assertions for the near-me distance query.
 *
 * Distance arithmetic is the same class of problem as the trip cost
 * arithmetic: nothing throws when it is wrong. A radians/degrees slip returns
 * a list — the wrong list, ordered plausibly — and the only way anyone finds
 * out is by driving somewhere. So the checks below pin the maths against
 * distances that can be verified on a map, rather than against itself.
 *
 * The second concern is the filter. businesses_near reaches the businesses
 * table directly, so a suspended or deleted listing appearing here would be a
 * hole in the same wall the directory maintains everywhere else.
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
  const near = async (lat, lng, km = 50, limit = 60) =>
    (await client.query('select * from businesses_near($1,$2,$3,$4)', [lat, lng, km, limit])).rows;

  console.log('\n--- The arithmetic matches a map ---');

  // Arusha to Moshi is about 80km by road and roughly 68km straight-line.
  // Anything outside 60–76 means a units error rather than a rounding one.
  const { rows: pair } = await client.query(
    `select 2 * 6371 * asin(sqrt(
       power(sin(radians(-3.35 - (-3.37)) / 2), 2) +
       cos(radians(-3.37)) * cos(radians(-3.35)) *
       power(sin(radians(37.34 - 36.68) / 2), 2)
     )) as km`,
  );
  check('Arusha to Moshi comes out around 68km', pair[0].km > 60 && pair[0].km < 76,
    `${pair[0].km.toFixed(1)}km`);

  // Degrees fed to a function expecting radians is the classic version of this
  // bug, and it produces a number roughly 57x too small.
  check('the result is not a radians/degrees slip', pair[0].km > 10,
    'a degrees-for-radians error lands near 1.2km here');

  console.log('\n--- The radius is a radius ---');

  const arusha = [-3.37, 36.68];
  const r10 = await near(...arusha, 10);
  const r50 = await near(...arusha, 50);
  const r200 = await near(...arusha, 200);

  check('a wider radius never returns fewer', r10.length <= r50.length && r50.length <= r200.length,
    `${r10.length} / ${r50.length} / ${r200.length}`);
  check('nothing comes back beyond the radius asked for',
    r50.every((r) => r.distance_km <= 50), `max ${Math.max(...r50.map((r) => r.distance_km)).toFixed(1)}km`);
  check('results are nearest first',
    r200.every((r, i) => i === 0 || r.distance_km >= r200[i - 1].distance_km));
  check('no negative distances', r200.every((r) => r.distance_km >= 0));

  // A point in open ocean. If this returns anything, the bounding box or the
  // radius filter is not doing what it says.
  const atlantic = await near(0, -30, 200);
  check('the middle of the Atlantic is empty', atlantic.length === 0, `${atlantic.length}`);

  console.log('\n--- Only listings the directory would show ---');

  const { rows: leaked } = await client.query(
    `select count(*) n
       from businesses_near($1,$2,$3,$4) f
       join businesses b on b.id = f.id
      where b.status <> 'approved' or b.deleted_at is not null`,
    [...arusha, 500, 60],
  );
  check('no unapproved or deleted listing is reachable', Number(leaked[0].n) === 0,
    `${leaked[0].n}`);

  console.log('\n--- Bounds hold ---');

  const capped = await near(...arusha, 500, 999);
  check('the limit is capped regardless of what is asked', capped.length <= 60,
    `${capped.length} rows for a requested 999`);

  const one = await near(...arusha, 500, 1);
  check('a limit of one returns the single nearest', one.length === 1);
  check('and it is the same row the unlimited query leads with',
    one[0]?.id === capped[0]?.id);

  console.log('\n--- There is enough data for the page to be worth having ---');

  const { rows: cov } = await client.query(
    `select
       count(*) filter (where latitude is not null) with_coords,
       count(*) total
     from businesses where status = 'approved' and deleted_at is null`,
  );
  const pct = Math.round((Number(cov[0].with_coords) / Number(cov[0].total)) * 100);
  check('most approved listings have coordinates', pct >= 50,
    `${cov[0].with_coords} of ${cov[0].total} (${pct}%)`);

  // The fallback chips search from a destination, so a destination without
  // coordinates would render a chip that finds nothing.
  const { rows: anchors } = await client.query(
    `select count(*) n from destinations
      where is_active and deleted_at is null and latitude is not null`,
  );
  check('there are destinations to search from', Number(anchors[0].n) >= 12,
    `${anchors[0].n} with coordinates`);

  const { rows: half } = await client.query(
    `select count(*) n from destinations where (latitude is null) <> (longitude is null)`,
  );
  check('destination coordinates come in pairs or not at all', Number(half[0].n) === 0);
} finally {
  client.release();
  await pool.end();
}

console.log('\n====================================================');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('====================================================\n');
process.exitCode = failed > 0 ? 1 : 0;
