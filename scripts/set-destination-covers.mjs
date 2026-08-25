import { pool } from './db.mjs';

/**
 * Gives a destination a cover from a business that sits inside it.
 *
 *   node scripts/set-destination-covers.mjs [--dry]
 *
 * The four Rwandan destinations were written from research and have no
 * photographs — nobody has uploaded one and there was nothing to borrow. There
 * is now: the Maps import brought in lodges and camps whose coordinates fall
 * inside those parks, and a photograph of a lodge in Volcanoes National Park is
 * a photograph of Volcanoes National Park.
 *
 * Prefers accommodation, which is photographed from the outside looking at the
 * landscape, over a tour operator, whose picture is usually an office or a logo.
 * Then prefers whichever is closest to the destination's own coordinates.
 *
 * Never overwrites a cover an admin uploaded.
 */

const DRY = process.argv.includes('--dry');
// 40km covers a compact park. Akagera is 1,120 km² and its lodges sit well
// inside it, further from the centroid than that.
const MAX_KM = 70;

function distanceKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const client = await pool.connect();

try {
  await client.query('begin');

  const { rows: dests } = await client.query(
    `select d.id, d.key, d.latitude, d.longitude
       from destinations d
      where d.is_active and d.deleted_at is null
        and d.cover_image_url is null
        and d.latitude is not null`,
  );

  if (!dests.length) {
    console.log('\n  Every destination already has a cover.\n');
  }

  let set = 0;
  for (const d of dests) {
    const { rows: candidates } = await client.query(
      `select b.name, b.latitude, b.longitude, b.cover_image_url,
              exists (
                select 1 from business_categories bc
                join categories c on c.id = bc.category_id
                where bc.business_id = b.id and c.key = 'hotels'
              ) as is_accommodation
         from businesses b
        where b.cover_image_url is not null
          and b.status = 'approved'
          and b.deleted_at is null
          and b.latitude is not null
          and b.country_code = (select country_code from destinations where id = $1)`,
      [d.id],
    );

    const near = candidates
      .map((c) => ({
        ...c,
        km: distanceKm(Number(d.latitude), Number(d.longitude), Number(c.latitude), Number(c.longitude)),
      }))
      .filter((c) => c.km <= MAX_KM)
      // Accommodation first, then closest.
      .sort((a, b) => Number(b.is_accommodation) - Number(a.is_accommodation) || a.km - b.km);

    if (!near.length) {
      console.log(`  ${d.key.padEnd(32)} nothing photographed within ${MAX_KM}km`);
      continue;
    }

    const pick = near[0];
    await client.query('update destinations set cover_image_url = $2 where id = $1', [
      d.id,
      pick.cover_image_url,
    ]);
    set++;
    console.log(`  ${d.key.padEnd(32)} from ${pick.name} (${pick.km.toFixed(1)}km)`);
  }

  if (DRY) {
    await client.query('rollback');
    console.log('\n  DRY RUN — rolled back');
  } else {
    await client.query('commit');
  }
  console.log(`\n  destinations given a cover ${set}\n`);
} catch (err) {
  await client.query('rollback');
  console.error('\n  Rolled back:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
