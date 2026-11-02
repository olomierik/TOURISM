import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Crawls tourism businesses region by region and folds them into the seed files.
 *
 *   node scripts/crawl-gmaps.mjs TZ            # every region of Tanzania
 *   node scripts/crawl-gmaps.mjs TZ Arusha     # one region
 *   node scripts/crawl-gmaps.mjs --dry TZ      # print the plan and the cost
 *   node scripts/crawl-gmaps.mjs TZ --recover <runId>   # collect an orphaned run
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
const RECOVER = (() => {
  const i = args.indexOf('--recover');
  return i === -1 ? null : args[i + 1];
})();
// --recover takes a value, so that value is not a positional argument; without
// this the run id is read as a region filter and matches nothing.
const positional = args.filter(
  (a, i) => !a.startsWith('--') && args[i - 1] !== '--recover',
);
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

/**
 * Fold one region's places into the seed file.
 *
 * Shared by the crawl loop and --recover, so a run collected after the fact
 * lands in the file exactly as it would have at the time.
 */
const absorb = (region, items) => {
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
  writeFileSync(seedPath, `${JSON.stringify(file, null, 2)}
`);
};

/**
 * Collect a run this process did not wait for.
 *
 * A crawl that outlived its caller is already paid for, so throwing it away
 * and crawling the region again costs the money twice. The region comes from
 * the run's own input rather than the command line, because that is what was
 * actually crawled.
 */
if (RECOVER) {
  const { data: run } = await (await api(`/actor-runs/${RECOVER}`)).json();
  if (run.status !== 'SUCCEEDED') {
    console.error(`  run ${RECOVER} is ${run.status}, not SUCCEEDED — nothing to collect yet.`);
    process.exit(1);
  }
  const input = await (await api(`/key-value-stores/${run.defaultKeyValueStoreId}/records/INPUT`)).json();
  const region = input.locationQuery;
  const items = await (
    await api(`/datasets/${run.defaultDatasetId}/items?clean=true&format=json`)
  ).json();
  console.log(`
  recovering ${items.length} place(s) from ${region}
`);
  absorb(region, items);
  console.log(`
  Done. Import with:  node scripts/import-gmaps.mjs --only=gmaps-${COUNTRY}
`);
  process.exit(0);
}

/**
 * What is left of this month's Apify allowance, in dollars.
 *
 * Measured, not estimated: a region of 240 places cost $1.58, so a plan with
 * $8 left pays for four more and then the account stops mid-crawl. Stopping
 * one region early is free; stopping halfway through a region spends the money
 * and keeps nothing, because a region is only recorded once its merge lands.
 */
const budgetLeft = async () => {
  try {
    const { data } = await (await api('/users/me/limits')).json();
    return data.limits.maxMonthlyUsageUsd - data.current.monthlyUsageUsd;
  } catch {
    // An unreadable allowance is not a reason to refuse to crawl.
    return Infinity;
  }
};

/** One region of every term filling up, at the $0.0066 per place we measured. */
const REGION_COST = SEARCH_TERMS.length * MAX_PER_SEARCH * 0.0066;

for (const [i, region] of todo.entries()) {
  const left = await budgetLeft();
  if (left < REGION_COST) {
    console.log(
      `
  Stopping with ${todo.length - i} region(s) to go: $${left.toFixed(2)} left, ` +
        `and a region costs about $${REGION_COST.toFixed(2)}.
` +
        `  Raise the Apify plan or re-run once the monthly cap resets. The ` +
        `regions already crawled are recorded and will be skipped.`,
    );
    break;
  }

  console.log(`\n  [${i + 1}/${todo.length}] ${region}  ($${left.toFixed(2)} left)`);

  try {
    // Started and polled rather than waited on in one request.
    // run-sync-get-dataset-items returned HTTP 408 on a dense region while the
    // crawl itself carried on running and billing: the sync call has its own
    // ceiling, shorter than a region can take, and when it trips there is no
    // run id in the response to recover from. Starting the run first means the
    // id is in hand before anything can time out, and a crawl that outlives
    // this process can still be collected with --recover.
    const { data: run } = await (
      await api('/acts/compass~crawler-google-places/runs', {
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
      })
    ).json();

    console.log(`    run ${run.id}`);

    let status = run.status;
    while (status === 'RUNNING' || status === 'READY') {
      await new Promise((r) => setTimeout(r, 15_000));
      ({
        data: { status },
      } = await (await api(`/actor-runs/${run.id}`)).json());
    }
    if (status !== 'SUCCEEDED') {
      throw new Error(`run ${run.id} ended ${status} — recover with --recover ${run.id}`);
    }

    const items = await (
      await api(`/datasets/${run.defaultDatasetId}/items?clean=true&format=json`)
    ).json();
    console.log(`    crawled ${items.length}`);

    absorb(region, items);
  } catch (err) {
    // One region failing is a gap, not a dead run — and the next attempt will
    // pick it up, because it was never recorded as done.
    console.error(`    FAILED: ${err.message}`);
  }
}

console.log(`\n  Done. Import with:  node scripts/import-gmaps.mjs --only=gmaps-${COUNTRY}\n`);
