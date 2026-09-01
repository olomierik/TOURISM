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
  check('most approved listings have coordinates', pct >= 90,
    `${cov[0].with_coords} of ${cov[0].total} (${pct}%)`);

  console.log('\n--- A position is never better than it is ---');

  // The whole point of 045. Without these, the site can place a listing from
  // its town name and then print a distance to the office door, which is a
  // number nobody measured.
  const { rows: unpaired } = await client.query(
    `select count(*) n from businesses
      where (latitude is null) <> (location_precision is null)`,
  );
  check('every coordinate says how well it is known', Number(unpaired[0].n) === 0,
    `${unpaired[0].n} unlabelled`);

  const { rows: halfCoord } = await client.query(
    `select count(*) n from businesses where (latitude is null) <> (longitude is null)`,
  );
  check('business coordinates come in pairs or not at all', Number(halfCoord[0].n) === 0);

  // A centroid claiming to be exact is the failure this column exists to
  // prevent, so it is checked against the gazetteer rather than trusted.
  const { rows: mislabelled } = await client.query(
    `select count(*) n
       from businesses b
       join city_coordinates g
         on lower(btrim(b.city)) = g.city and b.country_code = g.country_code
      where b.location_precision = 'exact'
        and b.latitude = g.latitude and b.longitude = g.longitude`,
  );
  check('no city centroid is labelled exact', Number(mislabelled[0].n) === 0,
    `${mislabelled[0].n} sitting on a gazetteer point`);

  // Deliberately off the Nairobi centroid. Searching *from* the centroid puts
  // all 251 backfilled listings at distance zero and the limit of 60 never
  // reaches an exact one — an all-city set, on which every assertion below
  // would pass without testing anything. A point a few kilometres away returns
  // both kinds, which is the only set worth checking.
  const mixed = await near(-1.32, 36.86, 25, 60);
  const exactCount = mixed.filter((r) => r.precision_level === 'exact').length;
  const cityCount = mixed.filter((r) => r.precision_level === 'city').length;

  check('the test set actually contains both kinds of position',
    exactCount > 0 && cityCount > 0, `${exactCount} exact, ${cityCount} city`);
  check('the search reports precision for every row',
    mixed.every((r) => r.precision_level === 'exact' || r.precision_level === 'city'),
    `${mixed.length} rows`);

  // The risk in adding precision to the query is that it quietly becomes a
  // ranking signal — city results pushed to the end, or dropped. Distance is
  // the ordering; precision only breaks ties.
  const misordered = mixed.filter((r, i) => i > 0 && r.distance_km < mixed[i - 1].distance_km);
  check('a centroid is ordered by distance like anything else',
    misordered.length === 0, `${misordered.length} out of order`);
  // Every Nairobi centroid listing sits on one point, so from any given place
  // they are all exactly the same distance away. That identity is what makes
  // the distance unprintable: it is the distance to a city, not to an address.
  // If someone later jitters the coordinates to make the map look nicer, this
  // is the check that notices.
  const cityDistances = new Set(
    mixed.filter((r) => r.precision_level === 'city').map((r) => r.distance_km.toFixed(6)),
  );
  check('centroid listings share one distance, because they share one point',
    cityDistances.size === 1, `${cityCount} rows, ${cityDistances.size} distinct distance(s)`);

  // Nairobi is the reason the gazetteer exists — 270 of the 335 listings
  // placed from a town are there — so a search from it must return them.
  const nairobi = await near(-1.286389, 36.817223, 25, 60);
  check('the backfilled city is now searchable', nairobi.length > 0,
    `${nairobi.length} within 25km of Nairobi`);
  check('and those results are labelled as centroids, not addresses',
    nairobi.some((r) => r.precision_level === 'city'));

  // The fallback chips search from a destination, so a destination without
  // coordinates would render a chip that finds nothing.
  // ------------------------------------------------------------------------
  // What happens when an operator pins their own location.
  //
  // The dashboard writes latitude, longitude and precision together, and the
  // form is capable of sending a coordinate with no precision — it does that
  // deliberately, to avoid relabelling a centroid as exact when somebody saves
  // the form without pinning. So the database has to be the thing that refuses
  // an unlabelled coordinate, and this checks that it still does.
  // Rolled back: this is a live table.
  // ------------------------------------------------------------------------
  const target = (
    await client.query(
      `select id from businesses where status = 'approved' and deleted_at is null limit 1`,
    )
  ).rows[0];

  const rejects = async (sql, params) => {
    await client.query('savepoint pin_test');
    try {
      await client.query(sql, params);
      await client.query('rollback to savepoint pin_test');
      return false;
    } catch {
      await client.query('rollback to savepoint pin_test');
      return true;
    }
  };

  await client.query('begin');
  try {
    check('an operator can save a pinned position',
      !(await rejects(
        `update businesses set latitude = -3.3869, longitude = 36.6830,
                               location_precision = 'exact' where id = $1`,
        [target.id],
      )));
    check('a coordinate with no precision is refused',
      await rejects(
        `update businesses set latitude = -3.3869, longitude = 36.6830,
                               location_precision = null where id = $1`,
        [target.id],
      ));
    check('a precision with no coordinate is refused',
      await rejects(
        `update businesses set latitude = null, longitude = null,
                               location_precision = 'exact' where id = $1`,
        [target.id],
      ));
  } finally {
    await client.query('rollback');
  }

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
