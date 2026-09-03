import { readFileSync } from 'node:fs';

/**
 * Decides which administrative region a coordinate belongs to.
 *
 * Shared by the validation run and the migration that fills the column, so the
 * accuracy that gets measured is the accuracy that ships.
 */

const FALLBACK_KM = 15;
const KM_PER_DEGREE = 111;

export function loadRegions(path = 'supabase/seed/regions.json') {
  return JSON.parse(readFileSync(path, 'utf8')).regions;
}

function inside([x, y], ring) {
  let hit = false;
  for (let i = 0, k = ring.length - 1; i < ring.length; k = i++) {
    const [xi, yi] = ring[i];
    const [xk, yk] = ring[k];
    if (yi > y !== yk > y && x < ((xk - xi) * (y - yi)) / (yk - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Distance from a point to a line segment, in degrees. */
function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * @returns {{ name: string | null, method: 'inside' | 'nearest' | null, km: number }}
 *
 * Containment first. Where a point is inside nothing, the nearest boundary
 * within 15km wins.
 *
 * That fallback is not papering over a bad boundary — it is the coastline being
 * the coastline. A beach hotel is by definition within metres of the line, the
 * line itself is simplified, and a Google pin often sits on the sand or just
 * off it. Kendwa measured 1km outside Unguja for exactly that reason, and it is
 * unambiguously in Unguja Kaskazini. Refusing to classify it would be precise
 * and useless.
 *
 * 15km is wide enough for any coastal or border pin and far too narrow to reach
 * across a region, so a point in open country still gets the region it is in.
 * Beyond that the answer is null, because a listing 200km out to sea has a
 * coordinate problem that a region guess would only hide.
 */
export function findRegion(lon, lat, regions, countryCode = null) {
  const pool = countryCode ? regions.filter((r) => r.countryCode === countryCode) : regions;

  for (const region of pool) {
    for (const ring of region.rings) {
      if (inside([lon, lat], ring)) return { name: region.name, method: 'inside', km: 0 };
    }
  }

  let best = Infinity;
  let name = null;
  for (const region of pool) {
    for (const ring of region.rings) {
      for (let i = 0, k = ring.length - 1; i < ring.length; k = i++) {
        const d = segmentDistance(lon, lat, ring[k][0], ring[k][1], ring[i][0], ring[i][1]);
        if (d < best) {
          best = d;
          name = region.name;
        }
      }
    }
  }

  // Latitude degrees are ~111km everywhere; longitude degrees shrink toward the
  // poles. Within 15km of the equator the difference is under 1%, so the flat
  // conversion is fine here and a haversine would be false precision.
  const km = best * KM_PER_DEGREE;
  return km <= FALLBACK_KM ? { name, method: 'nearest', km } : { name: null, method: null, km };
}
