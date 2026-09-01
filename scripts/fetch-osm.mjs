import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Collects tourism businesses from OpenStreetMap.
 *
 *   node scripts/fetch-osm.mjs TZ
 *
 * Writes supabase/seed/operators-osm-<CC>.json in the same record shape the
 * Google Maps crawl produces, so import-gmaps.mjs reads both without knowing
 * the difference.
 *
 * ---
 *
 * Why a second source at all.
 *
 * The directory has 234 approved Tanzanian listings against 635 Kenyan ones,
 * on a site called Explore Tanzania. Arusha — where most of the country's tour
 * operators are based — had eleven. The earlier Google crawl used six generic
 * search terms with no regional targeting, so it returned whatever Google
 * surfaced first: 78 listings in Mwanza and none in Zanzibar or Dar es Salaam.
 *
 * OpenStreetMap has 6,797 named tourism places in Tanzania. It is free, has no
 * usage limit, and its coordinates are surveyed rather than inferred, which
 * matters for a directory whose proximity search is only as good as its
 * positions.
 *
 * ---
 *
 * Only places somebody can actually contact.
 *
 * 6,797 named places sounds like the answer and is not: 6,056 of them carry no
 * phone, website or email. A listing a traveller cannot contact produces no
 * enquiry, which is the entire point of the directory, and importing six
 * thousand of them would bury the 234 real ones. So the filter below is the
 * whole difference between a bigger directory and a better one.
 *
 * ---
 *
 * Licensing.
 *
 * OpenStreetMap is ODbL. Attribution is required wherever the data appears,
 * which is why every record carries `attribution` and the importer writes it
 * into the listing's own description rather than burying it in a footer.
 */

const COUNTRY = (process.argv[2] ?? 'TZ').toUpperCase();

/**
 * Two instances, because one is not reliable enough to build a directory on.
 *
 * The main Overpass server answers 504 under load, and it does so for whole
 * categories at a time — a run that lost guest houses, hostels and restaurants
 * looked like a country with no guest houses rather than a failed query. Each
 * kind is retried across both hosts before it is given up on.
 */
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

/**
 * OSM's vocabulary mapped onto labels the importer's category rules already
 * understand, so one classifier serves both sources. 'chalet' becomes 'Lodge'
 * because the existing rules match `lodge` and not `chalet`, and a chalet in
 * this part of the world is a safari lodge by another name.
 */
const KINDS = [
  ['node["tourism"="hotel"]', 'Hotel'],
  ['way["tourism"="hotel"]', 'Hotel'],
  ['node["tourism"="guest_house"]', 'Guest house'],
  ['way["tourism"="guest_house"]', 'Guest house'],
  ['node["tourism"="hostel"]', 'Hostel'],
  ['node["tourism"="motel"]', 'Motel'],
  ['node["tourism"="chalet"]', 'Lodge'],
  ['node["tourism"="camp_site"]', 'Campsite'],
  ['way["tourism"="camp_site"]', 'Campsite'],
  ['node["tourism"="apartment"]', 'Serviced apartment'],
  ['node["shop"="travel_agency"]', 'Travel agency'],
  ['way["shop"="travel_agency"]', 'Travel agency'],
  ['node["amenity"="car_rental"]', 'Car rental'],
  ['node["amenity"="restaurant"]', 'Restaurant'],
  ['way["amenity"="restaurant"]', 'Restaurant'],
];

/**
 * One query per kind rather than one big union.
 *
 * The union across every tag times out on Overpass at 170 seconds — the public
 * instance is shared and a country-wide nwr query is too much to ask of it.
 * Fifteen small queries always finish, and a failure costs one kind instead of
 * the run.
 */
async function fetchKind(selector, label) {
  const query = `[out:json][timeout:90];
area["ISO3166-1"="${COUNTRY}"][admin_level=2]->.c;
${selector}["name"](area.c);
out center tags;`;

  let last = 'no attempt';
  // Each host twice, with a growing pause: a 504 here means the instance is
  // busy, and busy passes.
  for (let attempt = 0; attempt < ENDPOINTS.length * 2; attempt++) {
    const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // Overpass answers 406 to Node's default headers. It asks callers to
          // identify themselves and give a contact address, which is a fair
          // price for a free shared service and makes the traffic accountable
          // to somebody.
          'User-Agent': 'ExploreTanzania-directory/1.0 (+https://www.exploretanzania.online)',
          Accept: 'application/json',
        },
        body: new URLSearchParams({ data: query }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.remark) throw new Error(json.remark);
      return (json.elements ?? []).map((e) => ({ e, label }));
    } catch (err) {
      last = err.message;
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
  throw new Error(last);
}

const tag = (t, ...names) => {
  for (const n of names) {
    const v = t[n];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
};

/** Street address from the addr:* tags, as much of one as exists. */
function addressOf(t) {
  const line = [tag(t, 'addr:housenumber'), tag(t, 'addr:street')].filter(Boolean).join(' ');
  const parts = [line || null, tag(t, 'addr:city'), tag(t, 'addr:postcode')].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

/**
 * A website that is actually a website.
 *
 * OSM's website field is free text and holds Facebook pages, bare domains and
 * the occasional phone number. A bare domain is repaired; anything without a
 * host is dropped rather than stored as a link that goes nowhere.
 */
function websiteOf(t) {
  const raw = tag(t, 'website', 'contact:website', 'url');
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    return u.hostname.includes('.') ? u.toString() : null;
  } catch {
    return null;
  }
}

/** The first number, since OSM stores several separated by ; or , */
function phoneOf(t) {
  const raw = tag(t, 'phone', 'contact:phone', 'contact:mobile', 'mobile');
  if (!raw) return null;
  const first = raw.split(/[;,]/)[0].trim();
  return /\d{6}/.test(first) ? first : null;
}

console.log(`\n  OpenStreetMap: tourism businesses in ${COUNTRY}\n`);

const collected = [];
for (const [selector, label] of KINDS) {
  try {
    const rows = await fetchKind(selector, label);
    collected.push(...rows);
    console.log(`  ${String(rows.length).padStart(5)}  ${label.padEnd(20)} ${selector}`);
  } catch (err) {
    // One kind failing is a gap, not a dead run. Reported rather than swallowed
    // so a short file is never mistaken for a small country.
    console.log(`  FAILED   ${label.padEnd(20)} ${selector} — ${err.message}`);
  }
  // The public Overpass instance asks for restraint between queries.
  await new Promise((r) => setTimeout(r, 1500));
}

/**
 * Runs accumulate rather than replace.
 *
 * Overpass fails a whole category at a time under load, and a different one on
 * each attempt — one run lost restaurants, the next lost campsites. Overwriting
 * the file each time makes the result whatever the server felt like answering
 * that minute, and a category missing from the file is indistinguishable from
 * a category missing from the country. Merging on placeId means running it
 * again is always an improvement and never a loss.
 */
const path = `supabase/seed/operators-osm-${COUNTRY}.json`;
const previous = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')).places ?? []) : [];

const seen = new Set();
const places = [];
let noContact = 0;
let noPosition = 0;
let carried = 0;

for (const { e, label } of collected) {
  const t = e.tags ?? {};
  const lat = e.lat ?? e.center?.lat;
  const lng = e.lon ?? e.center?.lon;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    noPosition++;
    continue;
  }

  const phone = phoneOf(t);
  const website = websiteOf(t);
  const email = tag(t, 'email', 'contact:email');

  // The filter this script exists for. See the header.
  if (!phone && !website && !email) {
    noContact++;
    continue;
  }

  const key = `${e.type}/${e.id}`;
  if (seen.has(key)) continue;
  seen.add(key);

  places.push({
    placeId: `osm:${key}`,
    name: t.name,
    address: addressOf(t),
    city: tag(t, 'addr:city'),
    countryCode: COUNTRY,
    phone,
    email,
    website,
    lat,
    lng,
    categoryName: label,
    categories: [label],
    rating: null,
    reviews: 0,
    // OpenStreetMap does not carry photographs. These listings render the
    // site's own placeholder until an operator claims the listing and uploads
    // their own, which is the only picture anybody here has the right to use.
    images: [],
    mapsUrl: `https://www.openstreetmap.org/${e.type}/${e.id}`,
    source: 'osm',
    attribution: '© OpenStreetMap contributors',
  });
}

// Anything an earlier run found and this one did not is kept.
for (const prev of previous) {
  if (places.some((x) => x.placeId === prev.placeId)) continue;
  places.push(prev);
  carried++;
}

places.sort((a, b) => String(a.name).localeCompare(String(b.name)));

const out = {
  source: 'OpenStreetMap, via the Overpass API',
  licence: 'ODbL — https://opendatacommons.org/licenses/odbl/',
  attribution: '© OpenStreetMap contributors',
  retrieved: new Date().toISOString().slice(0, 10),
  countryCode: COUNTRY,
  searchTerms: KINDS.map(([, label]) => label).filter((v, i, a) => a.indexOf(v) === i),
  note:
    'Only places carrying a phone, website or email are kept — a listing nobody can contact produces no enquiry. ' +
    'No images: OpenStreetMap holds none, and the listings use the site placeholder until an operator uploads their own.',
  places,
};

writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);

console.log(`\n  collected      ${collected.length}`);
console.log(`  no position    ${noPosition}`);
console.log(`  no contact     ${noContact}  (skipped)`);
console.log(`  kept from earlier runs  ${carried}`);
console.log(`  written        ${places.length}  ->  ${path}\n`);
