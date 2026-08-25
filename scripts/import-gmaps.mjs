import { readFileSync, readdirSync } from 'node:fs';

import { pool } from './db.mjs';

/**
 * Imports tourism businesses collected from Google Maps.
 *
 *   node scripts/import-gmaps.mjs [--dry]
 *
 * Reads every supabase/seed/operators-gmaps-*.json file, so adding a country is
 * a crawl and a re-run rather than a code change.
 *
 * ---
 *
 * Destinations, at last.
 *
 * The licensing registers gave a postal address, which says where an operator is
 * registered and nothing about where they work. Google Maps gives coordinates
 * for every place, and every destination on this site has coordinates too, so
 * for the first time the question "which destinations does this operator serve"
 * has an answer that is measured rather than invented.
 *
 * A lodge at -1.72, 34.88 is inside the Serengeti. That is a fact about the
 * world, not a guess about a business.
 *
 * Two radii, because a national park is not a point. NEAR_KM catches the
 * destinations a place genuinely sits in or beside; NEAREST_KM is a wider net
 * that attaches only the single closest destination, so a town operator lands
 * somewhere sensible instead of nowhere. Where neither hits, and only then, the
 * listing falls back to every destination in its country — which is a weak
 * claim, so it is made as rarely as possible and reported separately.
 *
 * ---
 *
 * Images are URLs, not copies.
 *
 * Google's photographs belong to whoever uploaded them, and the Maps terms
 * restrict storing Places content. Referencing the file leaves the copy where it
 * is and stays reversible: deleting these rows removes every trace. Downloading
 * and re-hosting the bytes would not, which is why this does not do it.
 */

const DRY = process.argv.includes('--dry');

/** Attach every destination within this distance. */
const NEAR_KM = 60;
/** Failing that, attach the single closest destination within this distance. */
const NEAREST_KM = 150;

/**
 * Categories whose businesses sell across a country rather than sitting in one
 * place. Only these are eligible for the country-wide fallback.
 */
const SELLS_NATIONWIDE = new Set(['safaris', 'activities', 'tour-guides', 'car-rental']);

/**
 * Google's category vocabulary mapped onto ours.
 *
 * Ordered: the first pattern that matches wins, so the specific ones come before
 * the general. "Safari lodge" is accommodation, but "safari tour operator" is
 * not, and a naive substring match on "safari" would file both under safaris.
 */
const CATEGORY_RULES = [
  [/car (rental|hire|leasing)|rent a car|vehicle hire/i, 'car-rental'],
  [/lodge|hotel|resort|camp(site)?|guest ?house|hostel|motel|lodging|accommodation|bed (and|&) breakfast|serviced apartment/i, 'hotels'],
  [/tour(ist)? guide|tourist information/i, 'tour-guides'],
  // "Restaurant supply store" is a wholesaler and "catering food and drink
  // supplier" is a caterer; neither is somewhere a traveller eats. Bare `food`
  // matched both, which is how a tour agency ended up fronting the restaurants
  // category.
  [/restaurant(?! supply)|cafe|café|bar (and|&) grill|coffee shop|bakery|bistro|eatery|fine dining|steakhouse|pizzeria/i, 'restaurants'],
  [/tour operator|safari|travel agency|tour agency|adventure/i, 'safaris'],
  [/attraction|museum|national park|activit|excursion|balloon|diving|rafting/i, 'activities'],
];

function categoryFor(place) {
  // Google's own primary label decides first.
  //
  // Testing every category at once let any of six labels win. Edinicole Tours
  // carries 'Catering food and drink supplier', 'Construction company',
  // 'Restaurant supply store' and 'Tour agency' — the restaurants rule matched
  // one of the middle three and a tour operator was filed under restaurants.
  // categoryName is what Google itself considers the business to be, so it gets
  // the first say, and the rest are only consulted when it says nothing useful.
  for (const [pattern, key] of CATEGORY_RULES) {
    if (place.categoryName && pattern.test(place.categoryName)) return key;
  }

  const secondary = (place.categories ?? []).join(' | ');
  for (const [pattern, key] of CATEGORY_RULES) {
    if (pattern.test(secondary)) return key;
  }

  // Everything in these searches is tourism supply of some kind; an unmatched
  // category is more likely a Google label we have not seen than a mis-hit.
  return 'activities';
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

/** Great-circle distance in kilometres. */
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

const files = readdirSync('supabase/seed').filter(
  (f) => f.startsWith('operators-gmaps-') && f.endsWith('.json'),
);

if (!files.length) {
  console.error('  No supabase/seed/operators-gmaps-*.json files found.');
  process.exit(1);
}

const places = [];
for (const file of files) {
  const data = JSON.parse(readFileSync(`supabase/seed/${file}`, 'utf8'));
  for (const p of data.places) places.push({ ...p, sourceFile: file });
}

console.log(`\n  ${files.length} file(s), ${places.length} places\n`);

const client = await pool.connect();

const stats = {
  created: 0,
  updated: 0,
  skippedClaimed: 0,
  skippedDuplicate: 0,
  byProximity: 0,
  byCountryFallback: 0,
  noDestination: 0,
  images: 0,
  destinationLinks: 0,
};

try {
  await client.query('begin');

  const { rows: cats } = await client.query('select id, key from categories');
  const catId = new Map(cats.map((c) => [c.key, c.id]));

  const { rows: dests } = await client.query(
    `select id, key, country_code, latitude, longitude
     from destinations where is_active and deleted_at is null`,
  );
  const destinations = dests.map((d) => ({
    id: d.id,
    key: d.key,
    country: d.country_code,
    lat: Number(d.latitude),
    lng: Number(d.longitude),
  }));

  // Existing slugs, so a Google place that is already listed from the licensing
  // registers enriches that row instead of creating a near-duplicate beside it.
  const { rows: existingRows } = await client.query(
    'select id, slug, owner_id from businesses where deleted_at is null',
  );
  const bySlug = new Map(existingRows.map((b) => [b.slug, b]));

  for (const p of places) {
    if (!p.name || !p.lat || !p.lng) {
      stats.skippedDuplicate++;
      continue;
    }

    const slug = slugify(p.name);
    if (!slug) {
      stats.skippedDuplicate++;
      continue;
    }

    const existing = bySlug.get(slug);
    // A claimed listing belongs to its operator. Nothing here reaches into it.
    if (existing?.owner_id) {
      stats.skippedClaimed++;
      continue;
    }

    const country = p.countryCode || 'TZ';
    const category = categoryFor(p);

    // ---- destinations, by measured distance ------------------------------
    const inCountry = destinations.filter((d) => d.country === country);
    const withDistance = inCountry
      .map((d) => ({ ...d, km: distanceKm(p.lat, p.lng, d.lat, d.lng) }))
      .sort((a, b) => a.km - b.km);

    let matched = withDistance.filter((d) => d.km <= NEAR_KM);
    let basis = 'proximity';

    if (!matched.length && withDistance[0] && withDistance[0].km <= NEAREST_KM) {
      matched = [withDistance[0]];
    }

    if (!matched.length) {
      // The country-wide fallback, but only where it is defensible.
      //
      // A tour operator in Tanzania sells the northern circuit whether its
      // office is in Arusha, Dar or Mwanza — that is how the trade works, so
      // listing one under Serengeti is closer to true than leaving it nowhere.
      //
      // A hotel is not like that. A hotel is a location. Filing a Dar es Salaam
      // hotel under Serengeti would be visibly wrong to any traveller who
      // clicked it, so accommodation and restaurants get no fallback: if nothing
      // is near them, they carry no destination and simply do not appear on
      // destination pages.
      if (SELLS_NATIONWIDE.has(category)) {
        matched = inCountry;
        basis = 'country';
      }
    }

    // Order matters. A hotel with nothing within range now keeps basis
    // 'proximity' and an empty match list, so testing basis first counted it as
    // a proximity hit and reported 156 where the truth was 127.
    if (!matched.length) stats.noDestination++;
    else if (basis === 'proximity') stats.byProximity++;
    else stats.byCountryFallback++;

    let id;
    if (existing) {
      id = existing.id;
      await client.query(
        `update businesses
           set phone = coalesce(phone, $2), website = coalesce(website, $3),
               city = coalesce(city, $4), address = coalesce(address, $5),
               latitude = coalesce(latitude, $6), longitude = coalesce(longitude, $7),
               country_code = coalesce(country_code, $8)
         where id = $1`,
        [id, p.phone, p.website, p.city, p.address, p.lat, p.lng, country],
      );
      stats.updated++;
    } else {
      const { rows } = await client.query(
        `insert into businesses
           (owner_id, name, slug, country_code, phone, website, address, city,
            latitude, longitude, status, tier, is_verified, is_demo, published_at)
         values (null,$1,$2,$3,$4,$5,$6,$7,$8,$9,'approved','free',false,false,now())
         returning id`,
        [p.name, slug, country, p.phone, p.website, p.address, p.city, p.lat, p.lng],
      );
      id = rows[0].id;
      bySlug.set(slug, { id, slug, owner_id: null });
      stats.created++;

      const where = p.city ? `${p.city}, ` : '';
      await client.query(
        `insert into business_translations
           (business_id, locale, tagline, short_description, description)
         values ($1,'en',$2,$2,$3)
         on conflict (business_id, locale) do nothing`,
        [
          id,
          `${p.categoryName ?? 'Tourism business'} in ${where}${country === 'TZ' ? 'Tanzania' : country === 'KE' ? 'Kenya' : country === 'UG' ? 'Uganda' : 'Rwanda'}`.replace(', ,', ','),
          `${p.name} is a ${(p.categoryName ?? 'tourism business').toLowerCase()} listed on Google Maps at ${p.address ?? 'an address in ' + (p.city ?? country)}. ` +
            `This entry was compiled from public map data and has not yet been claimed by the business, ` +
            `so its details have not been confirmed by the operator.`,
        ],
      );
    }

    // At most one primary category per business, enforced by a partial unique
    // index. A listing seeded from the licensing registers already has one, so
    // claiming primary here would abort the whole import on the first collision.
    const cid = catId.get(category);
    if (cid) {
      const { rows: hasPrimary } = await client.query(
        'select 1 from business_categories where business_id = $1 and is_primary limit 1',
        [id],
      );
      await client.query(
        `insert into business_categories (business_id, category_id, is_primary)
         values ($1,$2,$3) on conflict (business_id, category_id) do nothing`,
        [id, cid, hasPrimary.length === 0],
      );
    }

    // Same rule for destinations. The nearest one is primary, but only if the
    // listing does not already have a primary from an earlier pass.
    const { rows: hasPrimaryDest } = await client.query(
      'select 1 from business_destinations where business_id = $1 and is_primary limit 1',
      [id],
    );
    let primaryTaken = hasPrimaryDest.length > 0;

    for (const d of matched) {
      const makePrimary = !primaryTaken && basis === 'proximity' && d === matched[0];
      await client.query(
        `insert into business_destinations (business_id, destination_id, is_primary)
         values ($1,$2,$3) on conflict (business_id, destination_id) do nothing`,
        [id, d.id, makePrimary],
      );
      if (makePrimary) primaryTaken = true;
      stats.destinationLinks++;
    }

    // Images as references. Replaced wholesale on re-run rather than appended,
    // so a re-crawl does not accumulate stale URLs beside fresh ones.
    if (p.images?.length) {
      await client.query(
        "delete from media where business_id = $1 and kind = 'gallery' and bucket = 'google-maps'",
        [id],
      );
      let order = 0;
      for (const url of p.images) {
        await client.query(
          `insert into media (business_id, kind, bucket, storage_path, public_url, alt_text, sort_order)
           values ($1,'gallery','google-maps',$2,$3,$4,$5)`,
          [id, `gmaps/${p.placeId}/${order}`, url, `${p.name}`, order],
        );
        order++;
        stats.images++;
      }
    }
  }

  if (DRY) {
    await client.query('rollback');
    console.log('  DRY RUN — rolled back\n');
  } else {
    await client.query('commit');
  }

  console.log(`  created            ${stats.created}`);
  console.log(`  updated existing   ${stats.updated}`);
  console.log(`  skipped (claimed)  ${stats.skippedClaimed}`);
  console.log(`  skipped (bad row)  ${stats.skippedDuplicate}`);
  console.log(`  destination links  ${stats.destinationLinks}`);
  console.log(`    by proximity     ${stats.byProximity} listings`);
  console.log(`    by country       ${stats.byCountryFallback} listings`);
  console.log(`  no destination     ${stats.noDestination} (accommodation with nothing nearby)`);
  console.log(`  image references   ${stats.images}`);
} catch (err) {
  await client.query('rollback');
  console.error('\n  Rolled back:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
