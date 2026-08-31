import { readFileSync } from 'node:fs';
import { pool } from './db.mjs';
import { safeImageUrl } from '../lib/images.ts';
import { MONTH_SLUGS, monthFromSlug, slugForMonth, highlightRank } from '../lib/months.ts';
import { detectCountryIntent } from '../lib/search/country-intent.ts';
import { countryName } from '../lib/country-names.ts';

/**
 * Assertions for the reference content added on top of the directory:
 * month-by-month seasonality, destination cost bands, operator day rates, and
 * the image guard.
 *
 * The image section is the one that matters most and reads the least
 * impressively. A single http:// URL in any image column throws inside
 * next/image, and a throw in a server component is a 500 for the entire page —
 * not a missing picture, a missing page. Sixteen listings carried one and
 * production answered 200 the whole time, because those pages had been
 * generated before the rows landed. It would have broken on the next deploy and
 * looked exactly like a deploy problem.
 */

let passed = 0;
let failed = 0;

function check(label, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const client = await pool.connect();

try {
  const one = async (sql, params = []) => (await client.query(sql, params)).rows[0];

  console.log('\n--- Seasonality covers everything, in every locale ---');

  const dest = await one(
    `select count(*) n from destinations where is_active and deleted_at is null`,
  );
  const seas = await one(
    `select count(*) n, count(distinct destination_id) d from destination_seasonality`,
  );
  check('every active destination has seasonality',
    Number(seas.d) === Number(dest.n), `${seas.d} of ${dest.n}`);
  check('every destination has all twelve months',
    Number(seas.n) === Number(dest.n) * 12, `${seas.n} rows`);

  const partial = await one(
    `select count(*) n from (
       select destination_id from destination_seasonality
       group by destination_id having count(*) <> 12) x`,
  );
  check('no destination has a partial year', Number(partial.n) === 0, `${partial.n} partial`);

  const { rows: locs } = await client.query(
    `select locale, count(*) n, count(*) filter (where coalesce(highlight,'') <> '') filled
       from destination_seasonality_translations group by locale order by locale`,
  );
  check('all four locales are present', locs.length === 4, locs.map((l) => l.locale).join(', '));
  for (const l of locs) {
    check(`${l.locale}: every month has text`,
      Number(l.filled) === Number(seas.n), `${l.filled} of ${seas.n}`);
  }

  const bad = await one(
    `select count(*) n from destination_seasonality
      where temp_min_c >= temp_max_c
         or rainfall_mm < 0 or rainfall_mm > 2000
         or weather_rating not between 1 and 5
         or crowd_level not between 1 and 5
         or (wildlife_rating is not null and wildlife_rating not between 1 and 5)`,
  );
  check('no impossible month', Number(bad.n) === 0, `${bad.n} bad rows`);

  // A destination where every month is peak season is a data-entry slip, not a
  // destination: "high season" that never ends tells a reader nothing.
  const allPeak = await one(
    `select count(*) n from (
       select destination_id from destination_seasonality
       group by destination_id having bool_and(is_peak_season)) x`,
  );
  check('no destination is peak season all year', Number(allPeak.n) === 0);

  console.log('\n--- Cost bands are coherent ---');

  const costs = await one(`select count(*) n from destination_costs`);
  check('cost bands exist', Number(costs.n) > 0, `${costs.n} destinations`);

  const unordered = await one(
    `select count(*) n from destination_costs
      where budget_low > budget_high or midrange_low > midrange_high
         or luxury_low > luxury_high or park_fee_low > park_fee_high`,
  );
  check('no inverted band', Number(unordered.n) === 0);

  const overlap = await one(
    `select count(*) n from destination_costs
      where budget_high > midrange_high or midrange_high > luxury_high`,
  );
  check('budget ≤ mid-range ≤ luxury at the top of each band',
    Number(overlap.n) === 0, `${overlap.n} out of order`);

  // A fee floor above the budget day rate would mean the cheapest trip cannot
  // pay its own entry, which is either wrong or a genuinely useful thing to
  // know — and either way not something to publish without noticing.
  const impossible = await one(
    `select count(*) n from destination_costs
      where park_fee_low is not null and budget_low is not null
        and park_fee_low > budget_low`,
  );
  check('the fee floor never exceeds the budget day rate',
    Number(impossible.n) === 0, `${impossible.n} impossible`);

  const orphanFee = await one(
    `select count(*) n from destination_costs where park_fee_low is not null and authority is null`,
  );
  check('every quoted fee names its authority', Number(orphanFee.n) === 0);

  const staleYear = await one(
    `select count(*) n from destination_costs where fees_as_of < 2025`,
  );
  check('no cost row is dated before 2025', Number(staleYear.n) === 0);

  console.log('\n--- Operator day rates ---');

  let halfRange = null;
  try {
    await client.query(
      `insert into businesses (name, slug, status, country_code, day_rate_low)
       values ('Rate Probe', 'zzz-rate-probe', 'draft', 'TZ', 200)`,
    );
  } catch (err) {
    halfRange = err;
  }
  check('a one-sided day rate is rejected', Boolean(halfRange),
    halfRange?.constraint ?? 'no error');

  let inverted = null;
  try {
    await client.query(
      `insert into businesses (name, slug, status, country_code, day_rate_low, day_rate_high)
       values ('Rate Probe', 'zzz-rate-probe', 'draft', 'TZ', 900, 200)`,
    );
  } catch (err) {
    inverted = err;
  }
  check('an inverted day rate is rejected', Boolean(inverted), inverted?.constraint ?? 'no error');

  let silly = null;
  try {
    await client.query(
      `insert into businesses (name, slug, status, country_code, day_rate_low, day_rate_high)
       values ('Rate Probe', 'zzz-rate-probe', 'draft', 'TZ', 5, 9)`,
    );
  } catch (err) {
    silly = err;
  }
  check('a $5-a-day safari is rejected as a typo', Boolean(silly), silly?.constraint ?? 'no error');

  console.log('\n--- Trips are attached to the places they visit ---');

  // The bug this section exists for: package_destinations was read by three
  // queries and written by none. The queries inner-join it, so an empty table
  // returned an empty list rather than an error — the "tours here" section on
  // all 46 destination pages simply never rendered, and no test noticed because
  // nothing asserted that a published trip reaches a destination page.
  const linked = await one(
    `select count(distinct package_id) n from package_destinations`,
  );
  const published = await one(
    `select count(*) n from packages where status = 'published' and deleted_at is null`,
  );
  check('every published trip visits at least one destination',
    Number(linked.n) >= Number(published.n),
    `${linked.n} linked, ${published.n} published`);

  const ordered = await one(
    `select count(*) n from (
       select package_id from package_destinations
       group by package_id
       having count(*) <> count(distinct sort_order)) x`,
  );
  check('sort_order is unique within a trip', Number(ordered.n) === 0,
    `${ordered.n} trips with duplicate positions`);

  const zeroBased = await one(
    `select count(*) n from (
       select package_id from package_destinations
       group by package_id having min(sort_order) <> 0) x`,
  );
  check('every trip route starts at position 0', Number(zeroBased.n) === 0);

  // The join that powers the destination page. Asserted as SQL rather than
  // trusting the query layer, because the query layer is what was broken.
  const reachable = await one(
    `select count(distinct p.id) n
       from packages p
       join package_destinations pd on pd.package_id = p.id
       join businesses b on b.id = p.business_id
      where p.status = 'published' and p.deleted_at is null
        and b.status = 'approved' and b.deleted_at is null`,
  );
  check('a published trip is reachable from a destination page',
    Number(reachable.n) > 0, `${reachable.n} reachable`);

  // Every destination a trip claims must actually exist and be live, or the
  // card renders a name for a page that 404s.
  const dangling = await one(
    `select count(*) n from package_destinations pd
       left join destinations d
              on d.id = pd.destination_id and d.is_active and d.deleted_at is null
      where d.id is null`,
  );
  check('no trip points at a missing or inactive destination', Number(dangling.n) === 0);

  // The visits line names destinations in the reader's language, falling back
  // to English. A destination with no English name would render a gap.
  const noEnglish = await one(
    `select count(*) n from destinations d
      where d.is_active and d.deleted_at is null
        and not exists (
          select 1 from destination_translations t
           where t.destination_id = d.id and t.locale = 'en'
             and coalesce(t.name, '') <> '')`,
  );
  check('every destination has an English name to fall back to',
    Number(noEnglish.n) === 0, `${noEnglish.n} without one`);

  console.log('\n--- The month pages have something to say ---');

  // 12 months x 4 locales = 48 pages, and every one of them has to name a real
  // destination. A month whose best three are all cities or all adverse would
  // render a page that answers nothing.
  const monthGaps = await one(
    `select count(*) n from generate_series(1,12) m
      where not exists (
        select 1 from destination_seasonality s
         where s.month = m and s.wildlife_rating >= 4)`,
  );
  check('every month has at least one strong destination', Number(monthGaps.n) === 0,
    `${monthGaps.n} empty months`);

  const eventMonths = await one(
    `select count(distinct month) n from destination_seasonality
      where highlight_key in ('calving','river_crossing','rut','whale_shark','flamingo',
                              'turtles','climbing','kwita_izina','festival',
                              'reverse_season','kilimanjaro_view')`,
  );
  check('seasonal events are spread across the year',
    Number(eventMonths.n) >= 6, `${eventMonths.n} months carry one`);

  // Slugs are the URLs. A duplicate or a missing one is a 404 in that locale.
  for (const locale of ['en', 'de', 'fr', 'it']) {
    const slugs = MONTH_SLUGS[locale];
    check(`${locale}: twelve month slugs`, slugs.length === 12, `${slugs.length}`);
    check(`${locale}: no duplicate slug`, new Set(slugs).size === 12);
    check(`${locale}: slugs are url-safe`, slugs.every((x) => /^[a-z]+$/.test(x)));
    check(`${locale}: every slug round-trips`,
      slugs.every((x, i) => monthFromSlug(x, locale) === i + 1));
    check(`${locale}: slugForMonth is the inverse`,
      Array.from({ length: 12 }, (_, i) => i + 1).every(
        (m) => monthFromSlug(slugForMonth(m, locale), locale) === m));
  }

  // The ranking rule that decides what leads each month.
  check('a seasonal event outranks a year-round quality',
    highlightRank('river_crossing') > highlightRank('rhino'));
  check('a year-round quality outranks silence',
    highlightRank('rhino') > highlightRank(null));
  check('adverse conditions sort below silence',
    highlightRank('long_rains') < highlightRank(null));
  check('an unknown key is treated as a quality, not dropped',
    highlightRank('something_new_someone_added') === highlightRank('rhino'));

  console.log('\n--- robots.txt advertises every sitemap section ---');

  // Two hand-kept lists that must agree. They already drifted once: whenToGo
  // was added to the sitemap generator and not to robots, so 48 month pages
  // existed, were crawlable, and were advertised to nobody. A sitemap nothing
  // points at is the quietest way to publish pages that never get found.
  const sitemapSrc = readFileSync('app/sitemap.ts', 'utf8');
  const robotsSrc = readFileSync('app/robots.ts', 'utf8');
  const listOf = (src, marker) => {
    const start = src.indexOf(marker);
    const end = src.indexOf('] as const', start);
    // Hyphens included. Without them the rename to 'when-to-go' dropped the
    // entry from BOTH lists, and the assertion went on passing because it was
    // comparing two equally incomplete sets — agreeing with itself while
    // missing the thing it exists to catch.
    return [...src.slice(start, end).matchAll(/'([a-zA-Z-]+)'/g)].map((m) => m[1]);
  };
  const inSitemap = listOf(sitemapSrc, 'const SECTIONS = [');
  const inRobots = listOf(robotsSrc, 'const SITEMAP_SECTIONS = [');

  // An exact count, not just "non-empty": two lists can agree perfectly by
  // both being wrong, which is how this assertion passed at 7/7 after a rename
  // its own regex could not read.
  const EXPECTED_SECTIONS = 8;
  check('both section lists have every section',
    inSitemap.length === EXPECTED_SECTIONS && inRobots.length === EXPECTED_SECTIONS,
    `${inSitemap.length} / ${inRobots.length} of ${EXPECTED_SECTIONS}`);
  check('robots advertises every sitemap section',
    inSitemap.every((x) => inRobots.includes(x)),
    inSitemap.filter((x) => !inRobots.includes(x)).join(', ') || 'all present');
  check('robots advertises nothing that does not exist',
    inRobots.every((x) => inSitemap.includes(x)),
    inRobots.filter((x) => !inSitemap.includes(x)).join(', ') || 'none extra');

  console.log('\n--- Facet counts are true ---');

  // A wrong number in a filter is worse than no number: it promises a result
  // set and then hands over a different one.
  const { rows: cats } = await client.query(
    `select c.key, count(distinct b.id) n
       from business_categories bc
       join businesses b on b.id = bc.business_id
       join categories c on c.id = bc.category_id
      where b.status = 'approved' and b.deleted_at is null
      group by c.key`,
  );
  check('category facets have counts to show', cats.length > 0, `${cats.length} categories`);

  // Compared against the real total, and without the `|| true` that made the
  // first version of this line incapable of failing — the exact shape of dead
  // assertion this suite exists to catch elsewhere.
  const liveTotal = Number(
    (await one(
      `select count(*) n from businesses where status = 'approved' and deleted_at is null`,
    )).n,
  );
  check('no category count exceeds the live listing total',
    cats.every((c) => Number(c.n) <= liveTotal),
    `${cats.map((c) => `${c.key}:${c.n}`).join(' ')} of ${liveTotal}`);

  // A category claiming every listing would mean the classifier collapsed.
  check('no single category claims every listing',
    cats.every((c) => Number(c.n) < liveTotal));

  const orphanCat = await one(
    `select count(*) n from business_categories bc
       left join businesses b on b.id = bc.business_id
      where b.id is null`,
  );
  check('no category link points at a missing listing', Number(orphanCat.n) === 0);

  const orphanDest = await one(
    `select count(*) n from business_destinations bd
       left join businesses b on b.id = bd.business_id
      where b.id is null`,
  );
  check('no destination link points at a missing listing', Number(orphanDest.n) === 0);

  console.log('\n--- A country in the search box is a filter, not a keyword ---');

  // Reported bug: searching "tanzania" returned Kenyan and Ugandan operators.
  // The text match was right and the answer was wrong — six Nairobi companies
  // are literally named "Kenya and Tanzania Safaris", so a keyword search finds
  // them. Somebody typing a country name is naming where they want to go.
  const intents = [
    ['tanzania', 'TZ', ''],
    ['Tansania', 'TZ', ''],
    ['TANZANIE', 'TZ', ''],
    ['tanzania safari', 'TZ', 'safari'],
    ['Ouganda', 'UG', ''],
    ['kenya lodge', 'KE', 'lodge'],
    ['Ruanda gorilla', 'RW', 'gorilla'],
  ];
  for (const [q, code, rest] of intents) {
    const got = detectCountryIntent(q);
    check(`"${q}" reads as ${code}`, got?.code === code, got?.code ?? 'null');
    check(`"${q}" keeps "${rest}" as the search`, (got?.rest ?? null) === rest,
      JSON.stringify(got?.rest ?? null));
  }

  // Things that must NOT be swallowed as a country.
  for (const q of ['serengeti', 'gorilla trekking', 'kilimanjaro', '', 'safari']) {
    check(`"${q}" is left as a plain search`, detectCountryIntent(q) === null,
      detectCountryIntent(q)?.code ?? 'null');
  }

  // A two-letter code is only a country when it is the whole query — "ke"
  // inside a phrase is far more likely to be someone mid-word.
  check('"ke" alone reads as Kenya', detectCountryIntent('ke')?.code === 'KE');
  check('"ke lodge" does not read as Kenya', detectCountryIntent('ke lodge') === null);

  // The six Kenyan operators that caused the report must still be reachable —
  // the fix narrows a country search, it does not hide anyone.
  const kenyanMentioningTz = await one(
    `select count(*) n from businesses b
       join business_translations bt on bt.business_id = b.id and bt.locale = 'en'
      where b.status = 'approved' and b.deleted_at is null and b.country_code = 'KE'
        and (b.name ilike '%tanzania%' or bt.tagline ilike '%tanzania%'
             or bt.short_description ilike '%tanzania%')`,
  );
  check('Kenyan operators selling Tanzania trips still exist and are findable',
    Number(kenyanMentioningTz.n) > 0,
    `${kenyanMentioningTz.n} reachable via country=KE&q=tanzania`);

  // Localized country names, which the countries table does not hold.
  check('German gets Tansania', countryName('TZ', 'de') === 'Tansania');
  check('German gets Kenia', countryName('KE', 'de') === 'Kenia');
  check('French gets Ouganda', countryName('UG', 'fr') === 'Ouganda');
  check('English is unchanged', countryName('TZ', 'en') === 'Tanzania');
  check('a bad code falls back rather than throwing',
    countryName('ZZZZ', 'en', 'Somewhere') === 'Somewhere');
  check('a null code falls back', countryName(null, 'en', 'Anywhere') === 'Anywhere');

  console.log('\n--- Nothing on a "things to do" page that is not a thing to do ---');

  // Found by looking at /activities/serengeti, which was listing auto body
  // shops in Mwanza. Seven listings, but 63 destination attachments between
  // them: 'activities' and 'car-rental' sell nationwide in the importer, so a
  // misclassified garage is attached to every destination in its country and
  // reaches up to fifteen pages titled "Things to do in <somewhere>".
  const NOT_TOURISM =
    "(auto (repair|parts|body)|car repair|mechanic|spare part|welding|hardware store|" +
    "petrol|filling station|supermarket|pharmacy|nursery school|primary school|" +
    "electronics store|furniture|stationery|butcher|clothing store|money transfer|law firm)";

  const junk = await one(
    `select count(distinct b.id) n
       from businesses b
       join business_translations bt on bt.business_id = b.id and bt.locale = 'en'
      where b.status = 'approved' and b.deleted_at is null
        and bt.short_description ~* $1`,
    [NOT_TOURISM],
  );
  check('no approved listing is plainly not a tourism business',
    Number(junk.n) === 0, `${junk.n} still live`);

  const junkLinks = await one(
    `select count(*) n
       from business_destinations bd
       join businesses b on b.id = bd.business_id
       join business_translations bt on bt.business_id = b.id and bt.locale = 'en'
      where b.status = 'approved' and b.deleted_at is null
        and bt.short_description ~* $1`,
    [NOT_TOURISM],
  );
  check('none of them is attached to a destination', Number(junkLinks.n) === 0,
    `${junkLinks.n} attachments`);

  // A suspended listing must not reach the public site through any other path.
  const suspendedLive = await one(
    `select count(*) n from business_categories bc
       join businesses b on b.id = bc.business_id
      where b.status = 'suspended'`,
  );
  check('a suspended listing holds no category link', Number(suspendedLive.n) === 0,
    `${suspendedLive.n} links`);

  // The nationwide rule is what turns one bad row into fifteen bad pages, so
  // the categories it applies to are worth stating out loud.
  const nationwideCats = await one(
    `select count(*) n from categories where key in ('safaris','activities','tour-guides','car-rental')`,
  );
  check('the four nationwide categories still exist', Number(nationwideCats.n) === 4,
    `${nationwideCats.n} of 4`);

  console.log('\n--- Things to do are things, not businesses ---');

  const attractions = await one('select count(*) n from attractions where is_active');
  const attrDests = await one(
    'select count(distinct destination_id) n from attractions where is_active',
  );
  check('there are things to do', Number(attractions.n) > 0, `${attractions.n} across ${attrDests.n} destinations`);

  // Every one needs text in at least English, or it renders as a blank card.
  const untranslated = await one(
    `select count(*) n from attractions a
      where a.is_active
        and not exists (
          select 1 from attraction_translations t
           where t.attraction_id = a.id and t.locale = 'en'
             and coalesce(t.name, '') <> '')`,
  );
  check('every one has an English name', Number(untranslated.n) === 0, `${untranslated.n} without`);

  // The tip is the reason the row exists. A name and a category is a label.
  const noTip = await one(
    `select count(*) n from attraction_translations
      where locale = 'en' and coalesce(tip, '') = ''`,
  );
  check('every one carries a tip worth reading', Number(noTip.n) === 0, `${noTip.n} without`);

  const orphan = await one(
    `select count(*) n from attractions a
       left join destinations d
              on d.id = a.destination_id and d.is_active and d.deleted_at is null
      where a.is_active and d.id is null`,
  );
  check('none points at a missing destination', Number(orphan.n) === 0);

  const dupSlug = await one(
    `select count(*) n from (
       select locale, slug from attraction_translations
       group by locale, slug having count(*) > 1) x`,
  );
  check('no two share a slug in one locale', Number(dupSlug.n) === 0);

  // is_free has three states and only two of them may render as a price claim.
  // Showing "unchecked" as free is the one mistake here that costs somebody money.
  const badFree = await one(
    `select count(*) n from attractions where is_free is not null and is_free not in (true, false)`,
  );
  check('is_free is true, false or unchecked — never anything else', Number(badFree.n) === 0);

  const sillyDuration = await one(
    `select count(*) n from attractions
      where typical_minutes is not null and (typical_minutes <= 0 or typical_minutes > 20160)`,
  );
  check('no attraction claims an impossible duration', Number(sillyDuration.n) === 0);

  const halfCoords = await one(
    `select count(*) n from attractions
      where (latitude is null) <> (longitude is null)`,
  );
  check('coordinates come in pairs or not at all', Number(halfCoords.n) === 0);

  // These are reference content, not listings: no owner, no contact, no reviews.
  const { rows: attrCols } = await client.query(
    `select column_name from information_schema.columns where table_name = 'attractions'`,
  );
  const cols = attrCols.map((c) => c.column_name);
  for (const forbidden of ['owner_id', 'email', 'phone', 'whatsapp', 'rating_avg']) {
    check(`attractions have no ${forbidden} — they are not listings`, !cols.includes(forbidden));
  }

  console.log('\n--- Events say when, and never guess ---');

  const events = await one('select count(*) n from events where is_active');
  check('there are events', Number(events.n) > 0, `${events.n}`);

  // The whole risk in this table. A festival date is the one field on this site
  // that puts somebody on a plane, so an unannounced edition must read as
  // unannounced rather than as a plausible-looking date.
  const guessed = await one(
    `select count(*) n from events where is_active and next_start is not null`,
  );
  check('no event carries a date nobody confirmed', Number(guessed.n) === 0,
    `${guessed.n} with dates — each should be admin-entered from an organiser`);

  const noWhen = await one(
    `select count(*) n from events
      where is_active and typical_month is null and next_start is null`,
  );
  check('every event can say when', Number(noWhen.n) === 0);

  const annualNoMonth = await one(
    `select count(*) n from events where is_active and is_annual and typical_month is null`,
  );
  check('every annual event has its habitual month', Number(annualNoMonth.n) === 0);

  const badMonth = await one(
    `select count(*) n from events
      where typical_month is not null and typical_month not between 1 and 12`,
  );
  check('no impossible month', Number(badMonth.n) === 0);

  const noName = await one(
    `select count(*) n from events e
      where e.is_active and not exists (
        select 1 from event_translations t
         where t.event_id = e.id and t.locale = 'en' and coalesce(t.name,'') <> '')`,
  );
  check('every event has an English name', Number(noName.n) === 0);

  // The advice line is what a date listing cannot carry, and the reason the
  // page beats a Wikipedia list.
  const noAdvice = await one(
    `select count(*) n from event_translations where locale = 'en' and coalesce(advice,'') = ''`,
  );
  check('every event carries advice worth reading', Number(noAdvice.n) === 0, `${noAdvice.n} without`);

  const insecureSite = await one(
    `select count(*) n from events where website is not null and website !~* '^https://'`,
  );
  check('every linked organiser site is https', Number(insecureSite.n) === 0);

  const eventOrphan = await one(
    `select count(*) n from events e
       left join destinations d on d.id = e.destination_id and d.is_active
      where e.is_active and e.destination_id is not null and d.id is null`,
  );
  check('no event points at a missing destination', Number(eventOrphan.n) === 0);

  const dupEventSlug = await one(
    `select count(*) n from (
       select locale, slug from event_translations group by locale, slug having count(*) > 1) x`,
  );
  check('no two events share a slug in one locale', Number(dupEventSlug.n) === 0);

  console.log('\n--- Hidden gems name what they cost ---');

  const gems = await one('select count(*) n from hidden_gems where is_active');
  check('there are hidden gems', Number(gems.n) > 0, `${gems.n}`);

  // The reason this is not another listicle. A place is quiet because getting
  // there is harder or the lodges are fewer, and a page that sells the upside
  // while hiding that converts once. The column is NOT NULL with a length
  // floor, so this checks the floor is doing real work rather than passing on
  // forty characters of nothing.
  const thinTradeOff = await one(
    `select count(*) n from hidden_gem_translations where length(btrim(trade_off)) < 80`,
  );
  check('every trade-off is a real sentence, not a shrug', Number(thinTradeOff.n) === 0,
    `${thinTradeOff.n} under 80 chars`);

  const thinPitch = await one(
    `select count(*) n from hidden_gem_translations where length(btrim(pitch)) < 80`,
  );
  check('every pitch is a real sentence', Number(thinPitch.n) === 0);

  const untranslatedGem = await one(
    `select count(*) n from hidden_gems g
      where g.is_active and not exists (
        select 1 from hidden_gem_translations t
         where t.hidden_gem_id = g.id and t.locale = 'en')`,
  );
  check('every gem has English copy', Number(untranslatedGem.n) === 0);

  // A gem is a destination and renders as a link to it. Pointing at a suspended
  // or deleted one produces a card linking to a 404.
  const deadGem = await one(
    `select count(*) n from hidden_gems g
       join destinations d on d.id = g.destination_id
      where g.is_active and (not d.is_active or d.deleted_at is not null)`,
  );
  check('no gem points at a destination that is gone', Number(deadGem.n) === 0);

  const deadAlt = await one(
    `select count(*) n from hidden_gems g
       join destinations d on d.id = g.instead_of_id
      where g.is_active and (not d.is_active or d.deleted_at is not null)`,
  );
  check('no "instead of" points at a destination that is gone', Number(deadAlt.n) === 0);

  const selfRef = await one(
    `select count(*) n from hidden_gems where instead_of_id = destination_id`,
  );
  check('nothing is offered instead of itself', Number(selfRef.n) === 0);

  // The destination-page block is the half that does the work, and it only
  // renders where a famous destination has gems pointing at it. Zero here
  // means seventeen rows exist and no page shows any of them.
  const anchors = await one(
    `select count(distinct instead_of_id) n from hidden_gems
      where is_active and instead_of_id is not null`,
  );
  check('gems are anchored to well-known destinations', Number(anchors.n) >= 5,
    `${anchors.n} destinations show a "quieter alternatives" block`);

  // A gem that is itself one of the six famous places would be a contradiction,
  // and the giveaway is a destination appearing on both sides at once.
  const bothSides = await one(
    `select count(*) n from hidden_gems a
      where a.is_active and exists (
        select 1 from hidden_gems b
         where b.is_active and b.instead_of_id = a.destination_id)`,
  );
  check('nothing is both a gem and the famous place it replaces', Number(bothSides.n) === 0);

  const dupGem = await one(
    `select count(*) n from (
       select destination_id from hidden_gems group by destination_id having count(*) > 1) x`,
  );
  check('no destination is pitched twice', Number(dupGem.n) === 0);

  console.log('\n--- No image can 500 a page ---');

  for (const [table, column] of [
    ['businesses', 'logo_url'],
    ['businesses', 'cover_image_url'],
    ['categories', 'cover_image_url'],
    ['destinations', 'cover_image_url'],
    ['guides', 'cover_image_url'],
    ['packages', 'cover_image_url'],
    ['media', 'public_url'],
  ]) {
    const r = await one(`select count(*) n from ${table} where ${column} like 'http://%'`);
    check(`${table}.${column} holds no insecure URL`, Number(r.n) === 0, `${r.n} rows`);
  }

  check('the guard drops http', safeImageUrl('http://example.com/a.jpg') === null);
  check('the guard keeps https', safeImageUrl('https://example.com/a.jpg') !== null);
  check('the guard keeps our own relative paths', safeImageUrl('/img/a.png') === '/img/a.png');
  check('the guard drops a data URI', safeImageUrl('data:image/png;base64,AAA') === null);
  check('the guard drops nonsense rather than throwing',
    safeImageUrl('not a url') === null);
  check('the guard drops a bare hostname with no dot',
    safeImageUrl('https://localhost/a.png') === null);
  check('the guard passes null through', safeImageUrl(null) === null);
  check('the guard trims before deciding',
    safeImageUrl('  https://example.com/a.jpg  ') === 'https://example.com/a.jpg');
} catch (err) {
  failed += 1;
  console.error('\n  suite error:', err.message);
} finally {
  await client.query(`delete from businesses where slug = 'zzz-rate-probe'`);
  client.release();
  await pool.end();
}

console.log('\n==================================================');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('==================================================\n');
process.exitCode = failed > 0 ? 1 : 0;
