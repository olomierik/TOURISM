import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Folds a batch of Google Maps places into a country's seed file.
 *
 *   node scripts/add-gmaps-batch.mjs TZ "Arusha Region" < batch.json
 *
 * Reads the Apify crawler's own output on stdin and writes the shape
 * import-gmaps.mjs expects. The two vocabularies differ — `title` against
 * `name`, `location.lat` against `lat`, `imageUrl` against `images` — and
 * translating here rather than in the importer keeps the importer unaware of
 * which crawl a record came from, which is what lets the same file read Google
 * and OpenStreetMap batches side by side.
 *
 * Batches accumulate. A country is crawled region by region over many runs, and
 * overwriting would leave the file holding whichever region ran last. Records
 * are merged on placeId, and a later crawl wins field by field only where it
 * actually has a value: a re-crawl that comes back without a phone number must
 * not erase the phone number the previous one found.
 */

const COUNTRY = (process.argv[2] ?? '').toUpperCase();
const REGION = process.argv[3] ?? '';

if (!/^[A-Z]{2}$/.test(COUNTRY)) {
  console.error('  usage: node scripts/add-gmaps-batch.mjs <CC> "<Region>" < batch.json');
  process.exit(1);
}

const raw = readFileSync(0, 'utf8');
let incoming;
try {
  incoming = JSON.parse(raw);
} catch (err) {
  console.error(`  stdin was not JSON: ${err.message}`);
  process.exit(1);
}
if (!Array.isArray(incoming)) incoming = incoming.items ?? incoming.places ?? [];

/**
 * Google labels that are not tourism, whatever the place is called.
 *
 * The importer has its own copy of this and applies it again. Filtering here as
 * well keeps the seed file honest: a file that holds a hundred dentists is a
 * file somebody will one day import with the filter switched off.
 */
const NOT_TOURISM =
  /(auto (repair|parts|body)|car repair|mechanic|spare part|welding|hardware|petrol|filling station|supermarket|pharmacy|nursery school|primary school|secondary school|electronics|furniture|stationery|butcher|clothing|money transfer|law firm|dentist|hospital|clinic|church|mosque|bank$|atm|barber|salon|gym|laundry|tailor|carpenter|printing|hardware store)/i;

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

function convert(p) {
  const name = str(p.title ?? p.name);
  // The API flattens nested objects when a field list is given, so the same
  // record arrives as location.lat here and location: { lat } there depending
  // on how it was fetched. Both are read rather than one being assumed.
  const lat = p.location?.lat ?? p['location.lat'] ?? p.lat;
  const lng = p.location?.lng ?? p['location.lng'] ?? p.lng;
  if (!name || typeof lat !== 'number' || typeof lng !== 'number') return null;

  // Permanently closed places are not businesses a traveller can use, and a
  // directory that lists them is one people stop trusting.
  if (p.permanentlyClosed === true || p.temporarilyClosed === true) return null;

  const labels = [p.categoryName, ...(p.categories ?? [])].filter(Boolean).join(' | ');
  if (NOT_TOURISM.test(labels)) return null;

  // imageUrl is the place's own main photograph; imageUrls is the gallery.
  // Both are references to Google-hosted files and neither is copied — the
  // Maps terms restrict storing Places content, and a reference stays
  // reversible in a way a downloaded copy would not.
  //
  // https only. Google returns the occasional Agoda or Booking.com photograph
  // over plain http, and three of them reached the database before the content
  // suite caught it. A mixed-content image does not merely look wrong: the
  // browser blocks it, so the card renders an empty box on a page served over
  // https — which is every page.
  const images = [
    ...(str(p.imageUrl) ? [p.imageUrl] : []),
    ...(Array.isArray(p.imageUrls) ? p.imageUrls.filter((u) => typeof u === 'string') : []),
  ].filter((u) => u.startsWith('https://'));

  return {
    placeId: p.placeId,
    name,
    address: str(p.address),
    city: str(p.city),
    countryCode: str(p.countryCode)?.toUpperCase() ?? COUNTRY,
    phone: str(p.phone) ?? str(p.phoneUnformatted),
    website: str(p.website),
    lat,
    lng,
    categoryName: str(p.categoryName),
    categories: Array.isArray(p.categories) ? p.categories : [],
    rating: typeof p.totalScore === 'number' ? p.totalScore : null,
    reviews: typeof p.reviewsCount === 'number' ? p.reviewsCount : 0,
    images: [...new Set(images)].slice(0, 6),
    mapsUrl: str(p.url),
    source: 'gmaps',
    region: REGION || null,
  };
}

const path = `supabase/seed/operators-gmaps-${COUNTRY}.json`;
const file = existsSync(path)
  ? JSON.parse(readFileSync(path, 'utf8'))
  : {
      source: 'Google Maps, via Apify compass/crawler-google-places',
      retrieved: new Date().toISOString().slice(0, 10),
      countryCode: COUNTRY,
      searchTerms: [],
      regions: [],
      note: 'Image URLs reference Google-hosted files. They are not downloaded or re-hosted.',
      places: [],
    };

const byPlaceId = new Map((file.places ?? []).map((p) => [p.placeId, p]));

let added = 0;
let enriched = 0;
let rejected = 0;

for (const item of incoming) {
  const next = convert(item);
  if (!next) {
    rejected += 1;
    continue;
  }

  const prev = byPlaceId.get(next.placeId);
  if (!prev) {
    byPlaceId.set(next.placeId, next);
    added += 1;
    continue;
  }

  // Field by field, and only where the new crawl actually has something. A
  // re-crawl that returns no phone must not delete the phone already held.
  let changed = false;
  for (const [k, v] of Object.entries(next)) {
    const empty = v === null || v === undefined || (Array.isArray(v) && v.length === 0);
    if (empty) continue;
    const before = prev[k];
    const beforeEmpty =
      before === null || before === undefined || (Array.isArray(before) && before.length === 0);
    if (beforeEmpty || JSON.stringify(before) !== JSON.stringify(v)) {
      prev[k] = v;
      changed = true;
    }
  }
  if (changed) enriched += 1;
}

file.places = [...byPlaceId.values()].sort((a, b) => a.name.localeCompare(b.name));
file.retrieved = new Date().toISOString().slice(0, 10);
file.regions = [...new Set([...(file.regions ?? []), ...(REGION ? [REGION] : [])])].sort();

writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);

const withImage = file.places.filter((p) => p.images.length).length;
const withPhone = file.places.filter((p) => p.phone).length;

console.log(`  ${REGION || COUNTRY}: ${incoming.length} in`);
console.log(`    added      ${added}`);
console.log(`    enriched   ${enriched}`);
console.log(`    rejected   ${rejected}  (not tourism, closed, or unplaceable)`);
console.log(`  ${path} now holds ${file.places.length} places`);
console.log(`    with an image  ${withImage}`);
console.log(`    with a phone   ${withPhone}`);
