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

/**
 * --only=osm restricts the run to seed files whose name contains the argument.
 *
 * Every place costs several round trips to a pooler on another continent, so a
 * full run is thousands of them and takes long enough to look hung. Re-running
 * the 938 Google places to update them with what they already contain is most
 * of that time and none of the value.
 */
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7);

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
 * Google categories that are not tourism, whatever the business is called.
 *
 * "Ndapu Car Hire and General Supplies" is an auto body shop in Mwanza. The
 * name reads like a car rental, the classifier agreed, and because car-rental
 * sells nationwide it was attached to all fifteen Tanzanian destinations — so
 * four Mwanza garages appeared on "Things to do in Serengeti".
 *
 * Matched against Google's own category text rather than the name, because the
 * name is exactly what fooled the classifier. Checked before any category is
 * assigned: a listing that trips this is skipped outright rather than filed
 * somewhere harmless, since there is no category on a travel directory where a
 * nursery school belongs.
 */
const NOT_TOURISM = /(auto (repair|parts|body)|car repair|mechanic|spare part|welding|hardware store|petrol|filling station|supermarket|pharmacy|nursery school|primary school|electronics store|furniture|stationery|butcher|clothing store|money transfer|law firm)/i;

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
  // Rejected before anything else. A listing whose own Google label says auto
  // body shop or nursery school has no category on a travel directory, and
  // filing it under a harmless one still puts it on a destination page.
  const labels = [place.categoryName, ...(place.categories ?? [])].filter(Boolean).join(' | ');
  if (NOT_TOURISM.test(labels)) return null;

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

// Two sources now. Google Maps has contact details for almost everything and
// costs money per place; OpenStreetMap is free and unlimited but only a tenth
// of its places carry a phone or a website. They produce the same record shape
// on purpose, so everything below this line is unaware of which is which.
const files = readdirSync('supabase/seed')
  .filter((f) => /^operators-(gmaps|osm)-.+\.json$/.test(f))
  .filter((f) => !ONLY || f.includes(ONLY));

if (!files.length) {
  console.error('  No supabase/seed/operators-{gmaps,osm}-*.json files found.');
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
  skippedNotTourism: 0,
  skippedDuplicate: 0,
  byProximity: 0,
  byCountryFallback: 0,
  noDestination: 0,
  images: 0,
  destinationLinks: 0,
};

try {
  // Supabase caps statements at a few seconds by default, and this import runs
  // 1,700 places through several queries each inside one transaction. The cap
  // is there to stop a runaway query holding a shared pooler; a bulk import is
  // exactly the case it is not meant for, so it is lifted for this connection
  // only and put back by the disconnect.
  await client.query('begin');
  // SET LOCAL only has meaning inside a transaction, so it follows the begin
  // rather than preceding it — outside one it is a no-op with a warning, which
  // looks exactly like a setting that worked.
  await client.query("set local statement_timeout = '600s'");

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

  let seenCount = 0;
  for (const p of places) {
    // Progress, because a silent forty-minute transaction is indistinguishable
    // from a hung one.
    if (++seenCount % 200 === 0) console.log(`  ...${seenCount}/${places.length}`);

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

    // null means Google's own label says this is not a tourism business. Skip
    // the whole record rather than importing it uncategorised: an uncategorised
    // listing still reaches the directory, and the destination links below are
    // what put four Mwanza garages on "Things to do in Serengeti".
    if (category === null) {
      stats.skippedNotTourism++;
      continue;
    }

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
        // Same pairing rule as the insert. A row that had no coordinates and
        // gains one here must gain a precision in the same statement, and one
        // that already had a position keeps whatever precision it was given —
        // overwriting a city centroid's label with 'exact' would turn a known
        // guess into a claimed address.
        `update businesses
           set phone = coalesce(phone, $2), website = coalesce(website, $3),
               city = coalesce(city, $4), address = coalesce(address, $5),
               latitude = coalesce(latitude, $6), longitude = coalesce(longitude, $7),
               location_precision = coalesce(location_precision, 'exact'),
               country_code = coalesce(country_code, $8),
               email = coalesce(email, $9)
         where id = $1`,
        [id, p.phone, p.website, p.city, p.address, p.lat, p.lng, country, p.email ?? null],
      );
      stats.updated++;
    } else {
      const { rows } = await client.query(
        // location_precision is 'exact' and must be written in the same
        // statement as the coordinates: migration 045 added a check constraint
        // pairing the two, so a latitude with no precision is rejected outright.
        // 'exact' is the honest label here — both sources give the position of
        // the place itself, not the centre of the town it sits in.
        `insert into businesses
           (owner_id, name, slug, country_code, phone, email, website, address, city,
            latitude, longitude, location_precision,
            status, tier, is_verified, is_demo, published_at)
         values (null,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'exact','approved','free',false,false,now())
         returning id`,
        [p.name, slug, country, p.phone, p.email ?? null, p.website, p.address, p.city, p.lat, p.lng],
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
          `${p.name} is a ${(p.categoryName ?? 'tourism business').toLowerCase()} ` +
            `${p.source === 'osm' ? 'recorded in OpenStreetMap' : 'listed on Google Maps'} ` +
            `at ${p.address ?? 'an address in ' + (p.city ?? country)}. ` +
            `This entry was compiled from public map data and has not yet been claimed by the business, ` +
            `so its details have not been confirmed by the operator.` +
            // ODbL requires attribution wherever the data appears. Put on the
            // listing itself rather than in a site footer, because the footer
            // is not what somebody reads, links to or quotes — and a licence
            // condition satisfied only in a place nobody looks is a condition
            // satisfied on paper.
            (p.attribution ? ` Location data ${p.attribution}.` : ''),
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
  console.log(`  skipped (not tourism) ${stats.skippedNotTourism}`);
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
