import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pool, query } from './db.mjs';

/**
 * Gives listings a photograph that will still be there next month.
 *
 *   node scripts/backfill-images.mjs --run                      # everything, TZ then KE then UG then RW
 *   node scripts/backfill-images.mjs --run TZ --limit 50        # one country, one bite
 *   node scripts/backfill-images.mjs --plan TZ                  # what needs doing, and the Apify input
 *   node scripts/backfill-images.mjs --scrape TZ                # run the crawler (needs APIFY_TOKEN)
 *   node scripts/backfill-images.mjs --ingest .cache/images/TZ-places.json
 *   node scripts/backfill-images.mjs --ingest - < places.json   # items on stdin
 *   node scripts/backfill-images.mjs --dataset UwSquvcZHlBby6Ltf # a crawl already paid for
 *
 * ---
 *
 * Why the pictures disappeared, and why this does not hotlink.
 *
 * The Maps import stored Google's own image URLs. Those are signed and they
 * expire. Measured on 2026-11-01 against the URLs this repo crawled on
 * 2026-10-25 — six days old — eleven of twelve returned 403. Across the live
 * database, sixteen of eighteen sampled covers were dead. That is the setback
 * that stopped operators claiming their listings: they opened a profile with
 * their name on it and no photograph, because the photograph had rotted.
 *
 * So this downloads the bytes. Each image is fetched once, while its URL is
 * still warm, and pushed into the public `business-media` bucket. What lands in
 * `cover_image_url` is a Supabase URL that nobody signs and nothing expires.
 * Two images per business, the first one also promoted to the cover.
 *
 * ---
 *
 * Why a place id, and a distance check when there isn't one.
 *
 * Searching Google Maps by name returns the *best* match, not the right one.
 * "Angenwa Lodge Mwanza" came back as Annox Hotel, 2.3 km away — attach that
 * photograph and the listing now shows somebody else's hotel. Two defences:
 *
 *   1. Where a place id exists for the listing, ask for that id. The crawler
 *      takes `placeIds` and returns exactly those places. 1,484 of the 2,619
 *      approved listings can be matched to one through the seed files the
 *      original crawl left behind, keyed on country and slugified name.
 *   2. Otherwise search by name and *reject* the answer unless it lands within
 *      MAX_METRES of the coordinates already on the row and the names agree.
 *      This rule rejects Annox Hotel. A rejected match leaves the listing
 *      without a photograph, which is the right outcome — a wrong photograph is
 *      worse than none.
 *
 * Nothing here inserts a business. Every write is an update to a listing that
 * already exists and has no usable image, which is the brief: do not list a
 * business twice, do fix the ones whose pictures are gone.
 *
 * Resumable, because 2,480 listings is not one sitting. "Done" is not kept in a
 * file — it is `cover_image_url` pointing at our own storage. Re-running skips
 * whatever already succeeded, so an interrupted run costs nothing twice.
 */

const args = process.argv.slice(2);
const flag = (name) => {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return null;
  const [, v] = hit.split('=');
  if (v !== undefined) return v;
  const i = args.indexOf(hit);
  return args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : '';
};

const RUN = flag('run');
const DATASET = flag('dataset');
const PLAN = flag('plan');
const SCRAPE = flag('scrape');
const INGEST = flag('ingest');
const LIMIT = Number(flag('limit') ?? 0) || null;
const DRY = args.includes('--dry');

/** How far a searched-by-name place may sit from the coordinates we hold. */
const MAX_METRES = Number(process.env.BACKFILL_MAX_METRES ?? 400);
/** How alike the two names must be, 0–1, when there is no place id. */
const MIN_NAME_SCORE = Number(process.env.BACKFILL_MIN_NAME_SCORE ?? 0.6);
/** Images kept per listing. The first becomes the cover. */
const IMAGES_PER_BUSINESS = 2;

const CACHE = '.cache/images';
const BUCKET = 'business-media';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Metres between two coordinates. Equirectangular is plenty at this scale. */
const metres = (aLat, aLng, bLat, bLng) => {
  const toRad = Math.PI / 180;
  const x = (bLng - aLng) * toRad * Math.cos(((aLat + bLat) / 2) * toRad);
  const y = (bLat - aLat) * toRad;
  return Math.sqrt(x * x + y * y) * 6_371_000;
};

/**
 * Name agreement as a share of shared words.
 *
 * Deliberately word-based rather than edit-distance: "Antonio Lodge" and
 * "Annox Hotel" are four characters apart in places but share no word, and it
 * is the shared words that say two records are the same business.
 *
 * The denominator is the *longer* name, and that is the whole correctness of
 * this function. Dividing by the shorter one was tried and it put "4x4
 * Tanzania"'s photograph on "Mili Adventure Africa – Self Drive Safari & 4x4
 * Rental Tanzania", 300 m away: two words out of two in the short name, so a
 * perfect score. Against the longer name it is two out of nine, and rejected.
 */
const nameScore = (a, b) => {
  const words = (s) => new Set(slugify(s).split('-').filter((w) => w.length > 2));
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared / Math.max(A.size, B.size);
};

/** Listings whose cover is missing or points at a URL that expires. */
const NEEDS_IMAGE = `
  (cover_image_url is null
   or cover_image_url ~ 'googleusercontent|streetviewpixels|ggpht')
`;

/** Place ids left behind by the original crawl, keyed country|slug. */
function seedPlaceIds() {
  const byKey = new Map();
  for (const cc of ['TZ', 'KE', 'UG', 'RW']) {
    const path = `supabase/seed/operators-gmaps-${cc}.json`;
    if (!existsSync(path)) continue;
    for (const p of JSON.parse(readFileSync(path, 'utf8')).places ?? []) {
      if (p.placeId) byKey.set(`${cc}|${slugify(p.name)}`, p.placeId);
    }
  }
  return byKey;
}

async function listWork(country) {
  const { rows } = await query(
    `select id, name, slug, city, country_code, latitude, longitude, rating_count
       from businesses
      where status = 'approved' and deleted_at is null
        and country_code = $1
        and ${NEEDS_IMAGE}
      order by rating_count desc nulls last, name
      ${LIMIT ? 'limit ' + LIMIT : ''}`,
    [country],
  );
  const ids = seedPlaceIds();
  return rows.map((b) => ({ ...b, placeId: ids.get(`${b.country_code}|${slugify(b.name)}`) ?? null }));
}

/**
 * The crawler input for a batch of work.
 *
 * Two shapes, because the two matching strategies want different requests. Ids
 * go in one `placeIds` run — exact, and no search pages to pay for. The rest
 * are grouped by city, because `locationQuery` takes one location per run and a
 * city is a tight enough box for the distance check to mean something.
 */
function buildInputs(work) {
  const withId = work.filter((b) => b.placeId);
  const byCity = new Map();
  for (const b of work.filter((x) => !x.placeId)) {
    const key = b.city || 'unknown';
    if (!byCity.has(key)) byCity.set(key, []);
    byCity.get(key).push(b);
  }

  const inputs = [];
  for (let i = 0; i < withId.length; i += 250) {
    inputs.push({
      kind: 'ids',
      placeIds: withId.slice(i, i + 250).map((b) => b.placeId),
      maxImages: IMAGES_PER_BUSINESS + 1,
      scrapePlaceDetailPage: true,
      language: 'en',
    });
  }
  for (const [city, list] of byCity) {
    if (city === 'unknown') continue;
    const country = list[0].country_code;
    inputs.push({
      kind: 'search',
      city,
      searchStringsArray: list.map((b) => `${b.name} ${city}`),
      locationQuery: `${city}, ${COUNTRY_NAME[country] ?? country}`,
      maxCrawledPlacesPerSearch: 1,
      maxImages: IMAGES_PER_BUSINESS + 1,
      scrapePlaceDetailPage: true,
      skipClosedPlaces: true,
      language: 'en',
    });
  }
  return inputs;
}

const COUNTRY_NAME = { TZ: 'Tanzania', KE: 'Kenya', UG: 'Uganda', RW: 'Rwanda' };

/** Tanzania first, then Kenya, then the rest — the order the markets matter in. */
const ORDER = ['TZ', 'KE', 'UG', 'RW'];

// ----------------------------------------------------------------- run ----

if (RUN !== null) {
  // The three phases run as separate processes rather than as calls, because
  // the crawl is the part that fails: a dropped connection or an exhausted
  // Apify plan kills one phase of one country and leaves the countries already
  // ingested alone. Re-running picks up from the database, not from a file.
  const countries = RUN ? [RUN.toUpperCase()] : ORDER;
  const passthrough = LIMIT ? ['--limit', String(LIMIT)] : [];

  for (const country of countries) {
    console.log(`\n${'='.repeat(60)}\n  ${COUNTRY_NAME[country] ?? country}\n${'='.repeat(60)}`);
    for (const phase of [
      ['--plan', country, ...passthrough],
      ['--scrape', country],
      ['--ingest', `${CACHE}/${country}-places.json`, ...(DRY ? ['--dry'] : [])],
    ]) {
      const step = spawnSync(process.execPath, ['scripts/backfill-images.mjs', ...phase], {
        stdio: 'inherit',
      });
      if (step.status !== 0) {
        console.error(`\n  ${country} stopped at ${phase[0]}. Later countries are untouched.\n`);
        break;
      }
    }
  }
  await pool.end();
  process.exit(0);
}

// ---------------------------------------------------------------- plan ----

if (PLAN) {
  const country = PLAN.toUpperCase();
  const work = await listWork(country);
  const inputs = buildInputs(work);
  const withId = work.filter((b) => b.placeId).length;

  mkdirSync(CACHE, { recursive: true });
  const path = `${CACHE}/${country}-input.json`;
  writeFileSync(path, `${JSON.stringify({ country, work, inputs }, null, 2)}\n`);

  console.log(`\n  ${COUNTRY_NAME[country] ?? country}: ${work.length} listing(s) need an image`);
  console.log(`    ${withId} by place id (exact), ${work.length - withId} by name + distance check`);
  console.log(`    ${inputs.length} crawler run(s): ${inputs.filter((i) => i.kind === 'ids').length} id, ${inputs.filter((i) => i.kind === 'search').length} city`);
  console.log(`\n  Wrote ${path}`);
  console.log(`  Next:  node scripts/backfill-images.mjs --scrape ${country}\n`);
  await pool.end();
  process.exit(0);
}

// -------------------------------------------------------------- scrape ----

if (SCRAPE) {
  const country = SCRAPE.toUpperCase();
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.error(
      '\n  APIFY_TOKEN is not set.\n' +
        '  Add it to .env (gitignored, like the other keys):\n\n' +
        '    APIFY_TOKEN=apify_api_...\n\n' +
        '  From https://console.apify.com/settings/integrations\n\n' +
        '  Without it, run the crawler however you like and feed the dataset in:\n' +
        `    node scripts/backfill-images.mjs --ingest - < places.json\n`,
    );
    process.exit(1);
  }

  const planPath = `${CACHE}/${country}-input.json`;
  if (!existsSync(planPath)) {
    console.error(`  No plan. Run:  node scripts/backfill-images.mjs --plan ${country}`);
    process.exit(1);
  }
  const { inputs } = JSON.parse(readFileSync(planPath, 'utf8'));

  const all = [];
  for (const [i, input] of inputs.entries()) {
    const { kind, city, ...body } = input;
    console.log(`  [${i + 1}/${inputs.length}] ${kind}${city ? ' ' + city : ''}`);
    try {
      const res = await fetch(
        'https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?timeout=1800',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
      const items = await res.json();
      console.log(`      ${items.length} place(s)`);
      all.push(...items);
      // Written after every run, so an interrupted crawl is still ingestable.
      writeFileSync(`${CACHE}/${country}-places.json`, `${JSON.stringify(all)}\n`);
    } catch (err) {
      console.error(`      FAILED: ${err.message}`);
    }
  }

  console.log(`\n  ${all.length} place(s) in ${CACHE}/${country}-places.json`);
  console.log(`  Next:  node scripts/backfill-images.mjs --ingest ${CACHE}/${country}-places.json\n`);
  process.exit(0);
}

// ------------------------------------------------------------- dataset ----

/**
 * Pulling down a crawl that has already been paid for.
 *
 * A run started anywhere — the Apify console, the MCP connection, an earlier
 * attempt that died before ingest — leaves its results in a dataset that costs
 * nothing to read again. Without this the only way to recover one was to copy
 * it out by hand, which is both slow and the kind of thing that goes wrong
 * silently. Reading a dataset still needs the token; what it does not need is
 * a second crawl.
 */
if (DATASET) {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.error('\n  APIFY_TOKEN is not set; reading a dataset needs it.\n');
    process.exit(1);
  }

  const fields = 'placeId,title,city,countryCode,location,imageUrl,imageUrls';
  const res = await fetch(
    `https://api.apify.com/v2/datasets/${DATASET}/items?clean=true&format=json&fields=${fields}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    console.error(`  dataset ${DATASET}: HTTP ${res.status}`);
    process.exit(1);
  }

  mkdirSync(CACHE, { recursive: true });
  const path = `${CACHE}/dataset-${DATASET}.json`;
  const items = await res.json();
  writeFileSync(path, `${JSON.stringify(items)}\n`);
  console.log(`\n  ${items.length} place(s) → ${path}`);
  console.log(`  Next:  node scripts/backfill-images.mjs --ingest ${path}\n`);
  await pool.end();
  process.exit(0);
}

// -------------------------------------------------------------- ingest ----

if (!INGEST) {
  console.error(
    '\n  node scripts/backfill-images.mjs --run | --plan TZ | --scrape TZ |\n' +
      '                                   --dataset <id> | --ingest <file|->\n',
  );
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.');
  process.exit(1);
}

const raw =
  INGEST === '-'
    ? readFileSync(0, 'utf8')
    : readFileSync(INGEST, 'utf8');
const items = JSON.parse(raw);
// A bare array is an Apify dataset; `items` is one wrapped in a run response;
// `places` is this repo's own seed file, which the crawler writes directly.
const places = Array.isArray(items) ? items : (items.items ?? items.places ?? []);

/** Every listing still short of an image, in every country this file touches. */
const countries = [...new Set(places.map((p) => p.countryCode).filter(Boolean))];
const work = [];
for (const cc of countries.length ? countries : Object.keys(COUNTRY_NAME)) {
  work.push(...(await listWork(cc)));
}

const byPlaceId = new Map();
for (const p of places) if (p.placeId) byPlaceId.set(p.placeId, p);

/**
 * The place that goes with this listing, or nothing.
 *
 * An id match is taken on trust — it is the same Google record the original
 * crawl saw. A name match has to earn it twice over, on distance and on words,
 * and silence is an acceptable answer.
 */
function matchPlace(b) {
  if (b.placeId && byPlaceId.has(b.placeId)) {
    return { place: byPlaceId.get(b.placeId), how: 'id' };
  }
  if (b.latitude == null || b.longitude == null) return null;

  let best = null;
  for (const p of places) {
    const lat = p.location?.lat ?? p['location.lat'] ?? p.lat;
    const lng = p.location?.lng ?? p['location.lng'] ?? p.lng;
    if (lat == null || lng == null) continue;
    const d = metres(Number(b.latitude), Number(b.longitude), lat, lng);
    if (d > MAX_METRES) continue;
    const score = nameScore(b.name, p.title ?? p.name ?? '');
    if (score < MIN_NAME_SCORE) continue;
    if (!best || score > best.score || (score === best.score && d < best.d)) {
      best = { place: p, score, d };
    }
  }
  return best ? { place: best.place, how: `near ${Math.round(best.d)}m` } : null;
}

/**
 * Google serves whatever size the suffix asks for.
 *
 * `imageUrl` arrives as a 411px thumbnail, which is the listing-card width on a
 * phone and nothing like enough for a hero. The size is a parameter, not a
 * property of the stored file, so asking for 1600 costs the same request and
 * gives an image that survives being used as a cover.
 */
const upscale = (u) => String(u).replace(/=w\d+-h\d+-k-no$/, '=w1600-h1200-k-no');

const imagesOf = (p) => {
  const urls = [];
  if (Array.isArray(p.imageUrls)) urls.push(...p.imageUrls.map(upscale));
  if (Array.isArray(p.images)) urls.push(...p.images.map(upscale));
  if (p.imageUrl) urls.push(upscale(p.imageUrl));
  // Same photograph at two sizes is still one photograph; the signed path is
  // what identifies it, so dedupe on everything before the size suffix.
  const seen = new Set();
  const out = [];
  for (const u of urls) {
    const key = String(u).split('=')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
};

async function upload(businessId, url, index) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (ExploreTanzania image backfill)' } });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  if (!/^image\/(jpeg|png|webp|avif)$/.test(type)) throw new Error(`type ${type || 'none'}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 4_000) throw new Error(`${bytes.length} bytes`);

  const ext = type === 'image/jpeg' ? 'jpg' : type.split('/')[1];
  // Hashing the URL makes the path stable: a re-run of the same image lands on
  // the same object rather than growing a second copy in the bucket.
  const name = `${createHash('sha1').update(url).digest('hex').slice(0, 16)}-${index}.${ext}`;
  const path = `${businessId}/${name}`;

  const put = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
      'Content-Type': type,
      'x-upsert': 'true',
    },
    body: bytes,
  });
  if (!put.ok) throw new Error(`upload ${put.status} ${(await put.text()).slice(0, 120)}`);

  return {
    publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`,
    path,
    type,
    bytes: bytes.length,
  };
}

let done = 0;
let noMatch = 0;
let noImages = 0;
let failed = 0;

for (const b of work) {
  const hit = matchPlace(b);
  if (!hit) {
    noMatch++;
    continue;
  }

  const urls = imagesOf(hit.place).slice(0, IMAGES_PER_BUSINESS);
  if (!urls.length) {
    noImages++;
    continue;
  }

  const stored = [];
  for (const [i, url] of urls.entries()) {
    try {
      stored.push(await upload(b.id, url, i));
    } catch (err) {
      console.log(`    ${b.name}: image ${i} ${err.message}`);
    }
  }
  if (!stored.length) {
    failed++;
    continue;
  }

  if (DRY) {
    console.log(`  ${b.name} (${hit.how}) → ${stored.length} image(s)`);
    done++;
    continue;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    // The cover is the first image and nothing else reads it, so it is set
    // unconditionally here: every row this loop sees had no usable one.
    await client.query('update businesses set cover_image_url = $2, photo_count = $3 where id = $1', [
      b.id,
      stored[0].publicUrl,
      stored.length,
    ]);
    // The dead google-maps rows stay where they are rather than being deleted:
    // they carry the attribution for a photograph somebody did take, and the
    // gallery reads public_url, which now has live entries ahead of them.
    for (const [i, s] of stored.entries()) {
      await client.query(
        `insert into media (business_id, kind, bucket, storage_path, public_url, mime_type, size_bytes, sort_order)
         values ($1, 'gallery', $2, $3, $4, $5, $6, $7)
         on conflict do nothing`,
        [b.id, BUCKET, s.path, s.publicUrl, s.type, s.bytes, i],
      );
    }
    await client.query('commit');
    done++;
    if (done % 25 === 0) console.log(`  ${done} done`);
  } catch (err) {
    await client.query('rollback');
    console.error(`  ${b.name}: ${err.message}`);
    failed++;
  } finally {
    client.release();
  }
}

console.log(`\n  listings needing an image  ${work.length}`);
console.log(`  given images               ${done}${DRY ? ' (dry run, nothing written)' : ''}`);
console.log(`  no place matched           ${noMatch}`);
console.log(`  place had no photograph    ${noImages}`);
console.log(`  failed                     ${failed}\n`);

await pool.end();
