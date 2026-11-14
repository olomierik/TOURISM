import { pool } from './db.mjs';
import { cityDestinations } from '../supabase/seed/destinations-cities.mjs';

/**
 * Publishes the four city destinations and attaches the listings that belong
 * to them.
 *
 *   node scripts/seed-destinations-cities.mjs            # report only
 *   node scripts/seed-destinations-cities.mjs --apply
 *
 * Idempotent and keyed on `destinations.key`, the same shape as
 * seed-destinations-rwanda.mjs: revising the content file and re-running is the
 * editing workflow.
 *
 * It does two things rather than one, and the second is the reason the first is
 * worth doing. Creating a destination row publishes a destination page; it does
 * not publish a single combination page, because those are generated from pairs
 * that have an approved business attached (lib/queries/sitemap.ts
 * getComboEntries). A Nairobi row with no listings linked to it would add one
 * page and zero commercial ones.
 *
 * So the linking is here, in the same transaction. The rule is deliberately
 * dumb: an explicit map from a region name, or from the text in
 * `businesses.city`, to one destination key. No radius search, no fan-out
 * across every destination sharing a region. That restraint is the point —
 * Arusha region contains Ngorongoro, and a guesthouse in Arusha town linked to
 * the crater would claim to be somewhere it is not, on a page a reader is using
 * to decide who to call. These links also feed match_lead_to_businesses, so a
 * wrong one does not merely look wrong, it misroutes an enquiry.
 *
 * MERGE, not replace. link-destinations.mjs replaces a listing's destinations
 * because it is told the full set by hand; this script only knows one fact
 * about each listing, so it adds that fact and leaves anything already there
 * alone. A listing that already has destinations is skipped entirely.
 */

const APPLY = process.argv.includes('--apply');

/**
 * Region name (per country) -> destination key.
 *
 * Only regions whose listings have nowhere else to go. Arusha, Dar es Salaam,
 * Mjini Magharibi, Manyara, Western and the rest are absent on purpose: their
 * listings are already linked, and a region-level rule there would attach town
 * businesses to national parks.
 */
const REGION_TO_DESTINATION = [
  { country: 'KE', region: 'Nairobi', destination: 'nairobi' },
  { country: 'KE', region: 'Mombasa', destination: 'mombasa' },
  { country: 'KE', region: 'Kwale', destination: 'diani-beach' },
  { country: 'TZ', region: 'Mwanza', destination: 'mwanza' },
  { country: 'TZ', region: 'Dodoma', destination: 'dodoma' },
  { country: 'TZ', region: 'Mbeya', destination: 'mbeya' },
];

/**
 * `businesses.city` -> destination key, for the listings that have no region.
 *
 * 590 of the orphaned listings have no region_id and almost all of them came
 * from the Google Maps import, which left a free-text city. The spellings below
 * are the ones that actually occur with more than a handful of rows behind
 * them, normalised case-insensitively with punctuation stripped. Anything not
 * listed is left orphaned rather than guessed at: "Morogoro" could mean Mikumi
 * or Udzungwa, "Gangilonga" is a suburb of Iringa, and one listing is not worth
 * being wrong about.
 *
 * The Zanzibar village names are all on the one island and the destination row
 * covers the island, so they map cleanly. Karatu is the standard base town for
 * Ngorongoro — a lodge there genuinely serves the crater and says so in its own
 * copy — Moshi is the same relationship to Kilimanjaro, Nanyuki to Laikipia and
 * Naro Moru to Mount Kenya.
 */
const CITY_TO_DESTINATION = [
  ['arusha', 'arusha'],
  ['arusha tanzania', 'arusha'],
  ['usa river', 'arusha'],
  ['kisongo', 'arusha'],
  ['engutoto', 'arusha'],
  ['mateves', 'arusha'],
  ['moshi', 'kilimanjaro'],
  ['karatu', 'ngorongoro'],
  ['dar es salaam', 'dar-es-salaam'],
  ['zanzibar', 'zanzibar'],
  ['zanzibar islands', 'zanzibar'],
  ['stone town', 'zanzibar'],
  ['nungwi', 'zanzibar'],
  ['paje', 'zanzibar'],
  ['kiwengwa', 'zanzibar'],
  ['pwani mchangani', 'zanzibar'],
  ['matemwe', 'zanzibar'],
  ['jambiani', 'zanzibar'],
  ['michamvi', 'zanzibar'],
  ['michamvi kae', 'zanzibar'],
  ['bwejuu', 'zanzibar'],
  ['kendwa', 'zanzibar'],
  ['chake chake', 'pemba-island'],
  ['mafia', 'mafia-island'],
  // Nairobi and two of its satellites. One of these rows carries country_code
  // TZ, which is simply wrong in the source; the city text is not.
  ['nairobi', 'nairobi'],
  ['ongata rongai', 'nairobi'],
  ['ruiru', 'nairobi'],
  ['nanyuki', 'laikipia-and-ol-pejeta'],
  ['naro moru', 'mount-kenya'],
  ['naivasha', 'lake-naivasha-and-hell-s-gate'],
  ['malindi', 'watamu-and-malindi'],
];

/** Lower-case, strip anything that is not a letter or a space, collapse runs. */
const normalizeCity = (s) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const cityMap = new Map(CITY_TO_DESTINATION);

const client = await pool.connect();

try {
  await client.query('begin');

  // ---------------------------------------------------------------- destinations

  for (const d of cityDestinations) {
    const { rows: region } = await client.query(
      'select id from regions where country_code = $1 and name = $2',
      [d.country, d.region],
    );
    if (!region.length) {
      throw new Error(`No ${d.country} region named "${d.region}" for destination ${d.key}`);
    }

    const { rows: existing } = await client.query(
      'select id from destinations where key = $1',
      [d.key],
    );

    let id;
    if (existing.length) {
      id = existing[0].id;
      await client.query(
        `update destinations
           set country_code = $2, region_id = $3, latitude = $4, longitude = $5,
               is_featured = $6, sort_order = $7, is_active = true,
               is_demo = false, deleted_at = null
         where id = $1`,
        [id, d.country, region[0].id, d.latitude, d.longitude, d.featured ?? false, d.sortOrder ?? 0],
      );
      console.log(`updated destination ${d.key}`);
    } else {
      const { rows } = await client.query(
        `insert into destinations
           (key, country_code, region_id, latitude, longitude, is_featured, sort_order,
            is_active, is_demo)
         values ($1,$2,$3,$4,$5,$6,$7,true,false) returning id`,
        [d.key, d.country, region[0].id, d.latitude, d.longitude, d.featured ?? false, d.sortOrder ?? 0],
      );
      id = rows[0].id;
      console.log(`created destination ${d.key}`);
    }

    const entries = Object.entries(d.translations);

    for (const [locale, t] of entries) {
      await client.query(
        `insert into destination_translations
           (destination_id, locale, name, slug, summary, description, best_time,
            travel_tips, seo_title, seo_description)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$3,$5)
         on conflict (destination_id, locale) do update
           set name = excluded.name, slug = excluded.slug, summary = excluded.summary,
               description = excluded.description, best_time = excluded.best_time,
               travel_tips = excluded.travel_tips, seo_title = excluded.seo_title,
               seo_description = excluded.seo_description`,
        [id, locale, t.name, t.slug, t.summary, t.description, t.bestTime, t.travelTips],
      );
    }

    // hreflang is generated from these rows, so a locale dropped from the
    // content file has to stop being advertised: Google discards the whole
    // cluster when one member 404s.
    await client.query(
      `delete from destination_translations
       where destination_id = $1 and locale <> all($2::text[])`,
      [id, entries.map(([locale]) => locale)],
    );
  }

  // ---------------------------------------------------------------------- links

  const { rows: destIds } = await client.query(
    'select key, id from destinations where deleted_at is null',
  );
  const destByKey = new Map(destIds.map((d) => [d.key, d.id]));

  for (const [, key] of CITY_TO_DESTINATION) {
    if (!destByKey.has(key)) throw new Error(`CITY_TO_DESTINATION names unknown destination "${key}"`);
  }
  for (const r of REGION_TO_DESTINATION) {
    if (!destByKey.has(r.destination)) {
      throw new Error(`REGION_TO_DESTINATION names unknown destination "${r.destination}"`);
    }
  }

  // Only listings with no destination at all. One that already has any is left
  // untouched: this script knows one fact about a listing and must not be the
  // thing that decides a hand-curated set was wrong.
  const { rows: orphans } = await client.query(`
    select b.id, b.name, b.city, b.is_stub, b.region_id, rg.name region_name, rg.country_code region_country
    from businesses b
    left join regions rg on rg.id = b.region_id
    where b.status = 'approved' and b.deleted_at is null
      and not exists (select 1 from business_destinations bd where bd.business_id = b.id)
  `);

  const regionRule = new Map(
    REGION_TO_DESTINATION.map((r) => [`${r.country}|${r.region}`, r.destination]),
  );

  const planned = new Map(); // destination key -> count
  const links = [];
  let unmatched = 0;

  for (const b of orphans) {
    // Region first: it is a foreign key someone set, where `city` is free text
    // a crawler scraped.
    let key = b.region_id ? regionRule.get(`${b.region_country}|${b.region_name}`) : undefined;
    if (!key) key = cityMap.get(normalizeCity(b.city));
    if (!key) {
      unmatched += 1;
      continue;
    }
    links.push({ businessId: b.id, destinationId: destByKey.get(key) });
    planned.set(key, (planned.get(key) ?? 0) + 1);
  }

  console.log(`\norphaned approved listings: ${orphans.length}`);
  console.log(`matched to a destination:   ${links.length}`);
  console.log(`left orphaned (no rule):    ${unmatched}\n`);
  for (const [key, n] of [...planned].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  -> ${key}`);
  }

  if (APPLY) {
    // The exact set, written out before the transaction commits. Every listing
    // here had no destination at all, so this file is the undo: nothing else in
    // the table was touched and these rows can be deleted by (business_id,
    // destination_id) if the mapping turns out to be wrong.
    const { writeFile } = await import('node:fs/promises');
    const out = new URL('../.links-applied.json', import.meta.url);
    await writeFile(
      out,
      JSON.stringify({ appliedAt: new Date().toISOString(), links }, null, 2),
      'utf8',
    );
    console.log(`\nundo manifest: ${out.pathname}`);

    // is_primary: these listings had no destination, so the one being attached
    // is necessarily the primary one.
    for (const l of links) {
      await client.query(
        `insert into business_destinations (business_id, destination_id, is_primary)
         values ($1,$2,true)
         on conflict (business_id, destination_id) do nothing`,
        [l.businessId, l.destinationId],
      );
    }
    await client.query('commit');
    console.log(`\napplied: ${links.length} links written, ${cityDestinations.length} destinations published`);
  } else {
    await client.query('rollback');
    console.log('\ndry run — nothing written. Re-run with --apply.');
  }
} catch (err) {
  await client.query('rollback');
  console.error(err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
