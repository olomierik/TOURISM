import { writeFileSync } from 'node:fs';

/**
 * Builds a gazetteer of administrative regions with simplified boundaries.
 *
 *   node scripts/fetch-regions.mjs
 *
 * Writes supabase/seed/regions.json, which migration 056 loads into a table of
 * Postgres `polygon` values. A listing is then assigned its region by asking
 * which polygon contains its coordinates.
 *
 * ---
 *
 * Why boundaries and not city names.
 *
 * 2,545 of 2,618 listings carry coordinates; only 39% of the Tanzanian ones
 * carry a city. Coordinates are the signal that actually exists, and a point
 * either is or is not inside a region — where a city name has to be spelled the
 * way the gazetteer expects, which is how 'Dar es salaaam' happened.
 *
 * Why not centroids.
 *
 * Nearest-centroid is one line and wrong at every border. Tanzanian regions are
 * large and irregular: a lodge in northern Arusha region sits closer to
 * Kilimanjaro's centroid than to Arusha's, and a filter that files it under the
 * wrong region is a filter that returns the wrong answer confidently.
 *
 * Why not PostGIS.
 *
 * It is available and it is the right tool for real geometry work. This is not
 * real geometry work — it is one containment test against 100-odd polygons, and
 * Postgres has a native `polygon` type and a `@>` operator for exactly that. An
 * extension that adds thousands of objects to somebody's database should earn
 * its place, and for one point-in-polygon test it does not.
 */

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

/**
 * The admin level that matches the region taxonomy already in the database.
 *
 * Not the same number everywhere. Tanzania's 31 regions, Kenya's 47 counties
 * and Rwanda's 5 provinces are admin_level 4; Uganda's 4 regions are level 3,
 * and its level 4 is 146 districts. Taking level 4 everywhere would have given
 * Uganda 146 boundaries for a taxonomy that has 4 — and 146 is the wrong
 * granularity for this directory anyway, since 245 Ugandan listings spread over
 * 146 districts is a filter whose options are almost all empty.
 */
const COUNTRIES = [
  ['TZ', 'Tanzania', 4],
  ['KE', 'Kenya', 4],
  ['UG', 'Uganda', 3],
  ['RW', 'Rwanda', 4],
];

/**
 * How far a simplified boundary may stray — scaled to the region.
 *
 * A fixed tolerance is the obvious choice and it is wrong. 0.02° is about 2km:
 * harmless on Arusha, which is 300km across, and destructive on Unguja Mjini
 * Magharibi, which is 12km across. It moved Zanzibar's west coast inland past
 * Stone Town, so the busiest tourism town on the island fell outside its own
 * region and matched nothing at all.
 *
 * So the tolerance is a fraction of each region's own size, floored at ~100m so
 * a small island keeps its shape and capped at ~2km so a large mainland region
 * does not carry ten thousand points it has no use for.
 */
const toleranceFor = (ring) => {
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  const diagonal = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  return Math.min(0.02, Math.max(0.001, diagonal / 250));
};

async function overpass(query) {
  let last = 'no attempt';
  for (let attempt = 0; attempt < ENDPOINTS.length * 2; attempt++) {
    const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'ExploreTanzania-directory/1.0 (+https://www.exploretanzania.online)',
          Accept: 'application/json',
        },
        body: new URLSearchParams({ data: query }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.remark) throw new Error(json.remark);
      return json.elements ?? [];
    } catch (err) {
      last = err.message;
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
    }
  }
  throw new Error(last);
}

/**
 * Joins a relation's outer ways into closed rings.
 *
 * OSM stores a boundary as unordered way fragments pointing in whichever
 * direction they were drawn. They have to be walked end to end, reversing where
 * a fragment runs backwards, or the result is a polygon whose edges cross and
 * whose containment test is meaningless.
 */
function buildRings(members) {
  const ways = members
    .filter((m) => m.type === 'way' && (m.role === 'outer' || m.role === '') && m.geometry?.length)
    .map((m) => m.geometry.map((p) => [p.lon, p.lat]));

  const rings = [];
  const pool = [...ways];

  while (pool.length) {
    let ring = pool.shift();
    let joined = true;

    while (joined) {
      joined = false;
      const [hx, hy] = ring[0];
      const [tx, ty] = ring[ring.length - 1];
      // Closed already.
      if (Math.abs(hx - tx) < 1e-7 && Math.abs(hy - ty) < 1e-7 && ring.length > 3) break;

      for (let i = 0; i < pool.length; i++) {
        const w = pool[i];
        const [wx, wy] = w[0];
        const [ex, ey] = w[w.length - 1];
        const near = (a, b, c, d) => Math.abs(a - c) < 1e-7 && Math.abs(b - d) < 1e-7;

        if (near(tx, ty, wx, wy)) ring = ring.concat(w.slice(1));
        else if (near(tx, ty, ex, ey)) ring = ring.concat(w.slice(0, -1).reverse());
        else if (near(hx, hy, ex, ey)) ring = w.slice(0, -1).concat(ring);
        else if (near(hx, hy, wx, wy)) ring = w.slice(1).reverse().concat(ring);
        else continue;

        pool.splice(i, 1);
        joined = true;
        break;
      }
    }
    if (ring.length > 3) rings.push(ring);
  }
  return rings;
}

/** Shoelace area, for picking the mainland ring over an offshore islet. */
function area(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
}

/** Ramer-Douglas-Peucker. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;

  const dist = ([px, py], [ax, ay], [bx, by]) => {
    const dx = bx - ax;
    const dy = by - ay;
    if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };

  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];

  while (stack.length) {
    const [first, last] = stack.pop();
    let worst = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = dist(points[i], points[first], points[last]);
      if (d > worst) {
        worst = d;
        index = i;
      }
    }
    if (worst > tolerance && index > 0) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const out = [];

for (const [code, name, level] of COUNTRIES) {
  process.stdout.write(`\n  ${name} (${code}) `);
  try {
    const elements = await overpass(`[out:json][timeout:280];
area["ISO3166-1"="${code}"][admin_level=2]->.c;
relation["boundary"="administrative"]["admin_level"="${level}"](area.c);
out geom;`);

    for (const rel of elements) {
      const label = rel.tags?.name;
      if (!label) continue;

      const rings = buildRings(rel.members ?? []);
      if (!rings.length) continue;

      // Every ring, not just the largest.
      //
      // Keeping only the biggest is the tempting simplification and it loses
      // real places: Mafia Island is part of Pwani region and sits 20km off the
      // mainland, so the mainland ring is not where its listings are. A region
      // is genuinely allowed to be several pieces.
      //
      // Rings below ~1km² are dropped. They are sandbanks and rounding noise,
      // and nothing in this directory is on one.
      const kept = rings
        .filter((r) => area(r) > 1e-4)
        .sort((a, b) => area(b) - area(a))
        .map((r) => {
          const simplified = simplify(r, toleranceFor(r));
          // A polygon needs three distinct points to contain anything.
          return simplified.length >= 4 ? simplified : r;
        })
        .filter((r) => r.length >= 4);

      if (!kept.length) continue;

      const all = kept.flat();
      out.push({
        countryCode: code,
        name: label,
        // Kept so a listing can be attributed if a boundary is ever questioned.
        osmId: rel.id,
        // The centre of the bounding box of everything, used only to sort
        // regions and to draw a default map view — never to assign a listing.
        centre: [
          Math.round(((Math.min(...all.map((p) => p[0])) + Math.max(...all.map((p) => p[0]))) / 2) * 1e5) / 1e5,
          Math.round(((Math.min(...all.map((p) => p[1])) + Math.max(...all.map((p) => p[1]))) / 2) * 1e5) / 1e5,
        ],
        rings: kept.map((r) =>
          r.map(([lon, lat]) => [Math.round(lon * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5]),
        ),
      });
    }
    process.stdout.write(`— ${out.filter((r) => r.countryCode === code).length} regions`);
  } catch (err) {
    process.stdout.write(`— FAILED: ${err.message}`);
  }
  await new Promise((r) => setTimeout(r, 2000));
}

const path = 'supabase/seed/regions.json';
writeFileSync(
  path,
  `${JSON.stringify(
    {
      source: 'OpenStreetMap administrative boundaries via Overpass (admin_level 4, except Uganda at 3)',
      licence: 'ODbL — https://opendatacommons.org/licenses/odbl/',
      attribution: '© OpenStreetMap contributors',
      retrieved: new Date().toISOString().slice(0, 10),
      simplifiedTolerance: 'scaled per region: diagonal/250, clamped to 0.001-0.02 degrees',
      note: 'All outer rings above ~1km2 per region, simplified. Used only to decide which region a coordinate falls in.',
      regions: out,
    },
    null,
    2,
  )}\n`,
);

const points = out.reduce((n, r) => n + r.rings.reduce((m, g) => m + g.length, 0), 0);
const rings = out.reduce((n, r) => n + r.rings.length, 0);
console.log(`\n\n  ${out.length} regions, ${rings} rings, ${points} points (avg ${Math.round(points / out.length)}/region)`);
console.log(`  written to ${path}\n`);
