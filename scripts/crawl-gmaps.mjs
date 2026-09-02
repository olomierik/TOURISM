import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Crawls tourism businesses region by region and folds them into the seed files.
 *
 *   node scripts/crawl-gmaps.mjs TZ            # every region of Tanzania
 *   node scripts/crawl-gmaps.mjs TZ Arusha     # one region
 *   node scripts/crawl-gmaps.mjs --dry TZ      # print the plan and the cost
 *
 * Needs APIFY_TOKEN in .env. The token is the whole reason this exists: the
 * MCP connection can run the crawler but cannot hand a dataset to a file, so
 * every record would have to pass through a conversation to reach disk. Sixty
 * regions of that is thousands of round trips to do what one loop does.
 *
 * ---
 *
 * Progress is kept, not assumed.
 *
 * A run of sixty regions will be interrupted — a network drop, a rate limit, a
 * closed laptop. Each region is recorded in the seed file as it completes, and
 * a region already recorded is skipped unless --force is given. Re-running
 * after a failure resumes rather than starts again, which matters when every
 * region costs real money.
 */

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const FORCE = args.includes('--force');
const positional = args.filter((a) => !a.startsWith('--'));
const COUNTRY = (positional[0] ?? 'TZ').toUpperCase();
const ONLY = positional[1] ?? null;

// .env is not loaded for us here the way Next loads it.
if (!process.env.APIFY_TOKEN && existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*APIFY_TOKEN\s*=\s*(.+?)\s*$/);
    if (m) process.env.APIFY_TOKEN = m[1].replace(/^["']|["']$/g, '');
  }
}

const TOKEN = process.env.APIFY_TOKEN;
if (!TOKEN && !DRY) {
  console.error(
    '\n  APIFY_TOKEN is not set.\n' +
      '  Add it to .env (it is gitignored, like the other keys):\n\n' +
      '    APIFY_TOKEN=apify_api_...\n\n' +
      '  Get one at https://console.apify.com/settings/integrations\n',
  );
  process.exit(1);
}

/**
 * What we are looking for.
 *
 * One term per category the directory actually has, plus the two words East
 * African operators use for themselves. Terms are deliberately few: Google
 * returns overlapping results for near-synonyms, and each extra term costs a
 * full page of places to find the same businesses again.
 */
const SEARCH_TERMS = [
  'safari tour operator',
  'tour agency',
  'hotel',
  'lodge',
  'guest house',
  'restaurant',
  'car rental',
  'tour guide',
];

/**
 * Regions, in the order they are worth crawling.
 *
 * Tourism is not evenly spread and the budget is. Arusha and Kilimanjaro hold
 * most of the northern circuit's operators, Zanzibar most of the coast's
 * hotels; Katavi and Rukwa hold almost nothing. Crawling in this order means an
 * interrupted or half-funded run still got the places that matter.
 */
const REGIONS = {
  TZ: [
    'Arusha Region',
    'Kilimanjaro Region',
    'Zanzibar Urban West Region',
    'Dar es Salaam Region',
    'Manyara Region',
    'Mara Region',
    'Zanzibar North Region',
    'Zanzibar South and Central Region',
    'Pemba North Region',
    'Pemba South Region',
    'Pwani Region',
    'Morogoro Region',
    'Tanga Region',
    'Iringa Region',
    'Mbeya Region',
    'Dodoma Region',
    'Njombe Region',
    'Ruvuma Region',
    'Kigoma Region',
    'Mwanza Region',
    'Kagera Region',
    'Geita Region',
    'Shinyanga Region',
    'Simiyu Region',
    'Tabora Region',
    'Singida Region',
    'Songwe Region',
    'Rukwa Region',
    'Katavi Region',
    'Lindi Region',
    'Mtwara Region',
  ],
  KE: [
    'Nairobi County, Kenya',
    'Mombasa County, Kenya',
    'Kwale County, Kenya',
    'Kilifi County, Kenya',
    'Narok County, Kenya',
    'Kajiado County, Kenya',
    'Nakuru County, Kenya',
    'Laikipia County, Kenya',
    'Taita-Taveta County, Kenya',
    'Samburu County, Kenya',
    'Nyeri County, Kenya',
    'Meru County, Kenya',
    'Lamu County, Kenya',
    'Kisumu County, Kenya',
    'Uasin Gishu County, Kenya',
    'Machakos County, Kenya',
  ],
  UG: [
    'Kampala, Uganda',
    'Wakiso District, Uganda',
    'Kasese District, Uganda',
    'Kabale District, Uganda',
    'Kanungu District, Uganda',
    'Masindi District, Uganda',
    'Jinja District, Uganda',
    'Mbarara District, Uganda',
    'Fort Portal, Uganda',
    'Gulu District, Uganda',
  ],
  RW: [
    'Kigali, Rwanda',
    'Musanze District, Rwanda',
    'Rubavu District, Rwanda',
    'Karongi District, Rwanda',
    'Nyamasheke District, Rwanda',
    'Huye District, Rwanda',
    'Nyagatare District, Rwanda',
  ],
};

const MAX_PER_SEARCH = Number(process.env.CRAWL_MAX_PER_SEARCH ?? 60);

/** Roughly what one region costs on the free tier, for the plan printout. */
const estimate = (n) => (n * (0.004 + 0.002 + 0.001) + n * 3 * 0.0005).toFixed(2);

const regions = (REGIONS[COUNTRY] ?? []).filter((r) =>
  ONLY ? r.toLowerCase().includes(ONLY.toLowerCase()) : true,
);

if (!regions.length) {
  console.error(`  No regions listed for ${COUNTRY}${ONLY ? ` matching "${ONLY}"` : ''}.`);
  process.exit(1);
}

const seedPath = `supabase/seed/operators-gmaps-${COUNTRY}.json`;
const done = new Set(
  existsSync(seedPath) ? (JSON.parse(readFileSync(seedPath, 'utf8')).regions ?? []) : [],
);

const todo = FORCE ? regions : regions.filter((r) => !done.has(r));

console.log(`\n  ${COUNTRY}: ${regions.length} region(s), ${todo.length} still to crawl`);
console.log(`  up to ${MAX_PER_SEARCH} places per term, ${SEARCH_TERMS.length} terms`);
console.log(
  `  rough ceiling $${estimate(todo.length * SEARCH_TERMS.length * MAX_PER_SEARCH)} ` +
    `if every search fills up (they will not)\n`,
);

if (DRY) {
  todo.forEach((r) => console.log(`    ${r}`));
  console.log('\n  --dry: nothing was run.\n');
  process.exit(0);
}

const api = async (path, init) => {
  const res = await fetch(`https://api.apify.com/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res;
};

for (const [i, region] of todo.entries()) {
  console.log(`\n  [${i + 1}/${todo.length}] ${region}`);

  try {
    // run-sync-get-dataset-items blocks until the crawl finishes and returns
    // the items in one response, which is the whole point: no polling, and the
    // data arrives where it can be written to disk.
    const res = await api(
      '/acts/compass~crawler-google-places/run-sync-get-dataset-items?timeout=1800',
      {
        method: 'POST',
        body: JSON.stringify({
          searchStringsArray: SEARCH_TERMS,
          locationQuery: region,
          maxCrawledPlacesPerSearch: MAX_PER_SEARCH,
          language: 'en',
          skipClosedPlaces: true,
          // The detail page is what carries images and the full address; without
          // it the crawl returns a name and a pin.
          scrapePlaceDetailPage: true,
          maxImages: 3,
        }),
      },
    );

    const items = await res.json();
    console.log(`    crawled ${items.length}`);

    // Handed to the converter on stdin rather than duplicated here, so there is
    // one definition of what a seed record looks like.
    const merge = spawnSync(process.execPath, ['scripts/add-gmaps-batch.mjs', COUNTRY, region], {
      input: JSON.stringify(items),
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
    });
    process.stdout.write(merge.stdout ?? '');
    if (merge.status !== 0) throw new Error(merge.stderr?.slice(0, 300) ?? 'merge failed');

    // Recorded only after the merge succeeded, so an interrupted run resumes
    // from the last region that actually reached the file.
    const file = JSON.parse(readFileSync(seedPath, 'utf8'));
    file.regions = [...new Set([...(file.regions ?? []), region])].sort();
    file.searchTerms = SEARCH_TERMS;
    writeFileSync(seedPath, `${JSON.stringify(file, null, 2)}\n`);
  } catch (err) {
    // One region failing is a gap, not a dead run — and the next attempt will
    // pick it up, because it was never recorded as done.
    console.error(`    FAILED: ${err.message}`);
  }
}

console.log(`\n  Done. Import with:  node scripts/import-gmaps.mjs --only=gmaps-${COUNTRY}\n`);
