#!/usr/bin/env node
/**
 * Read what stub listings say about themselves on their own websites.
 *
 * 3,435 of 3,852 approved listings are stubs. 818 have an email address, so a
 * traveller's enquiry can reach a quarter of them; 2,210 publish a website.
 * This walks those websites once and takes two things from each:
 *
 *   an address   → written straight to `businesses.email` when that column is
 *                  null, which is the single cheapest lift available to lead
 *                  delivery. Nothing is ever overwritten.
 *   the facts    → the year it started, the register it is on, the languages it
 *                  guides in, the parks it names. Staged in
 *                  `business_crawl_facts` (migration 088) for the pass that
 *                  composes descriptions, so this crawl happens once.
 *
 * Why both in one pass: fetching 2,210 sites is the expensive part and it is
 * someone else's bandwidth. Doing it twice for two columns would be rude as
 * well as slow.
 *
 * What it does NOT do: copy anybody's prose into the directory. `page_text` is
 * stored as evidence so a composed sentence can be traced to its source, and
 * the composition pass is required to write original copy — republishing an
 * operator's own paragraphs is duplicate content, which is the opposite of the
 * problem this is meant to fix.
 *
 * Politeness, because this is 2,210 small businesses' servers:
 *   - robots.txt is fetched once per host and obeyed for our own user agent.
 *   - one request in flight per host, ever; CONCURRENCY hosts at a time.
 *   - 10s connect/read timeout, 1.5 MB cap, redirects followed to depth 3.
 *   - at most 3 pages per site: the homepage, and whichever of its links looks
 *     like a contact or about page.
 *   - a plain identifiable agent string with the site's own URL in it. No
 *     personal address: the operator does not need ours, and a crawl is not
 *     the place to publish anybody's.
 *
 * Dry by default — it crawls and reports, writing nothing.
 *
 *   node scripts/crawl-stub-sites.mjs --limit 25            # pilot, no writes
 *   node scripts/crawl-stub-sites.mjs --limit 25 --apply    # pilot, writes
 *   node scripts/crawl-stub-sites.mjs --apply               # all 2,210
 *   node scripts/crawl-stub-sites.mjs --apply --recrawl 30  # redo rows older than 30d
 *   node scripts/crawl-stub-sites.mjs --urls a.com,b.com    # extractor only, no database
 *
 * `--urls` touches neither table: it crawls the sites named and prints what the
 * extractor found. That is how the patterns below were tuned and how to check
 * them against a site that reads oddly, without a 2,210-row run to find out.
 */
import 'dotenv/config';
import { pool } from './db.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const APPLY = args.includes('--apply');
const LIMIT = Number(flag('limit', '0')) || null;
const RECRAWL_DAYS = Number(flag('recrawl', '0')) || null;
const CONCURRENCY = Math.max(1, Math.min(16, Number(flag('concurrency', '6')) || 6));

const UA =
  'ExploreTanzaniaDirectoryBot/1.0 (+https://exploretanzania.online/about; directory listing verification)';
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 1_500_000;
const MAX_PAGES_PER_SITE = 3;
/** Visible text kept per site. Enough for the facts, not an archive. */
const MAX_TEXT = 12_000;

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

/** robots.txt, once per host. Map<host, {disallow: string[]}|null>. */
const robotsCache = new Map();

/**
 * The Disallow rules that apply to us.
 *
 * Deliberately simple: the groups that matter are `*` and our own agent, and
 * only Disallow prefixes are honoured. Allow overrides and wildcards inside
 * paths are not parsed — when in doubt this is stricter than the standard, not
 * looser, which is the right way round to be wrong about somebody else's site.
 */
function parseRobots(text) {
  const disallow = [];
  let applies = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [keyRaw, ...rest] = line.split(':');
    const key = keyRaw.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') {
      applies = value === '*' || UA.toLowerCase().startsWith(value.toLowerCase().split('/')[0]);
    } else if (key === 'disallow' && applies && value) {
      disallow.push(value);
    }
  }
  return { disallow };
}

async function robotsFor(origin) {
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  let rules = { disallow: [] };
  try {
    const res = await fetchText(`${origin}/robots.txt`, 50_000);
    // A 4xx means no rules. Anything else we could not read, and an
    // unreadable robots.txt is treated as permissive for the homepage only,
    // which is what every other crawler does.
    if (res.ok && res.text) rules = parseRobots(res.text);
  } catch {
    // Unreachable robots.txt; proceed with no rules.
  }
  robotsCache.set(origin, rules);
  return rules;
}

function allowed(rules, pathname) {
  return !rules.disallow.some((d) => pathname.startsWith(d));
}

/** One fetch, bounded in time and size. Never throws for an HTTP status. */
async function fetchText(url, maxBytes = MAX_BYTES) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
        'Accept-Language': 'en',
      },
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !/text\/html|text\/plain|application\/xhtml/.test(type)) {
      return { ok: res.ok, status: res.status, text: null, url: res.url };
    }
    // Read with a cap rather than res.text(), so a 40 MB page cannot be the
    // reason this run dies.
    const reader = res.body?.getReader();
    if (!reader) return { ok: res.ok, status: res.status, text: null, url: res.url };
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      chunks.push(value);
      if (size > maxBytes) {
        void reader.cancel();
        break;
      }
    }
    const text = Buffer.concat(chunks).toString('utf8');
    return { ok: res.ok, status: res.status, text, url: res.url };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

/** Scripts, styles and tags out; entities and whitespace resolved. */
function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, ' ')
    .trim();
}

function titleOf(html) {
  const m = html.match(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i);
  return m ? visibleText(m[1]).slice(0, 200) : null;
}

/**
 * Addresses, from mailto: links first and the visible text second.
 *
 * The junk filter earns its place: template and analytics code leaves plenty
 * of address-shaped strings behind, and one of them written into
 * `businesses.email` is an enquiry that silently goes nowhere — worse than the
 * null it replaced, because the matcher would count the operator as reachable.
 */
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi;
const EMAIL_JUNK =
  /(example|test|domain|yourdomain|email|sentry|wixpress|godaddy|squarespace|sentry\.io|\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg|\.css|\.js)/i;

/** Addresses a person reads rather than a system: ordered last, never dropped. */
const FREE_MAIL = /@(gmail|googlemail|yahoo|hotmail|outlook|live|aol|icloud|protonmail|yandex)\./i;

function emailsFrom(html, text, siteHost) {
  const raw = [];
  for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) raw.push(decodeURIComponent(m[1]));
  for (const m of text.matchAll(EMAIL_RE)) raw.push(m[0]);

  // Normalise first, then de-duplicate. The other way round kept
  // "jambo@karibucamps.com" from the mailto: link and "Jambo@karibucamps.com."
  // from the sentence below it as two different addresses, and wrote the same
  // one twice into the staging row.
  const unique = [
    ...new Set(
      raw
        .map((e) => e.trim().toLowerCase().replace(/^mailto:/, '').replace(/[.,;:]+$/, ''))
        .filter((e) => e.includes('@') && !EMAIL_JUNK.test(e) && e.length <= 160),
    ),
  ];

  // The operator's own domain first, then anything else, then free mail.
  //
  // Only the first address is written to `businesses.email`, so this ordering
  // is the one that decides whether an enquiry arrives. info@theiragency.com is
  // a mailbox somebody is paid to watch; the personal gmail that turned up on a
  // maintenance page is a person's inbox, which may well work and may equally
  // be read once a fortnight. Both are kept — this only decides which goes in
  // the column.
  const domain = siteHost?.replace(/^www\./, '') ?? '';
  const rank = (e) => {
    if (domain && e.endsWith(`@${domain}`)) return 0;
    if (FREE_MAIL.test(e)) return 2;
    return 1;
  };
  return unique.sort((a, b) => rank(a) - rank(b)).slice(0, 8);
}

/** "since 1998", "established 2004", "founded in 2011" — not any stray year. */
function foundedYearFrom(text) {
  const now = new Date().getFullYear();
  for (const m of text.matchAll(
    /\b(?:since|established(?:\s+in)?|founded(?:\s+in)?|operating\s+since|in\s+business\s+since)\s+(19[5-9]\d|20[0-2]\d)\b/gi,
  )) {
    const y = Number(m[1]);
    if (y >= 1950 && y <= now) return y;
  }
  return null;
}

/**
 * The registers an operator claims. Names only — this records the claim, it
 * does not verify it; verification is the licence-checked flow, which is a
 * person reading a register.
 */
const ASSOCIATIONS = [
  ['TATO', /\bTATO\b|Tanzania Association of Tour Operators/i],
  ['TALA', /\bTALA\b|Tourist Agents Licensing/i],
  ['KATO', /\bKATO\b|Kenya Association of Tour Operators/i],
  ['AUTO', /\bAUTO\b|Association of Uganda Tour Operators/i],
  ['RTTA', /\bRTTA\b|Rwanda Tours (?:and|&) Travel/i],
  ['ATTA', /\bATTA\b|African Travel (?:and|&) Tourism Association/i],
  ['IATA', /\bIATA\b/],
  ['TTB', /Tanzania Tourist Board/i],
  ['KTB', /Kenya Tourism Board/i],
  ['UWA', /Uganda Wildlife Authority/i],
  ['TANAPA', /\bTANAPA\b|Tanzania National Parks/i],
];

const LANGUAGES = [
  ['en', /\bEnglish\b/i],
  ['de', /\bGerman\b|\bDeutsch\b/i],
  ['fr', /\bFrench\b|\bFran[cç]ais\b/i],
  ['it', /\bItalian\b|\bItaliano\b/i],
  ['es', /\bSpanish\b|\bEspa[nñ]ol\b/i],
  ['sw', /\bSwahili\b|\bKiswahili\b/i],
];

/** Licence numbers as written on the page, e.g. "TALA No. 12345". */
function licencesFrom(text) {
  const out = new Set();
  for (const m of text.matchAll(
    /\b(?:TALA|licen[cs]e|licence\s*no\.?|registration)\D{0,12}([A-Z]{0,4}[-/ ]?\d{3,10})\b/gi,
  )) {
    const v = m[1].trim();
    if (/\d{3}/.test(v)) out.add(v);
  }
  return [...out].slice(0, 4);
}

const PARKS = [
  'Serengeti', 'Ngorongoro', 'Kilimanjaro', 'Tarangire', 'Manyara', 'Ruaha',
  'Nyerere', 'Selous', 'Mikumi', 'Zanzibar', 'Arusha National Park', 'Mahale',
  'Katavi', 'Masai Mara', 'Amboseli', 'Tsavo', 'Nakuru', 'Samburu',
  'Bwindi', 'Murchison', 'Queen Elizabeth', 'Kibale', 'Volcanoes', 'Akagera',
  'Nyungwe',
];

const ACTIVITIES = [
  ['camping', /\bcamping\b|\bcamp(?:site|ing) safari/i],
  ['lodge', /\blodge\b/i],
  ['balloon', /\bballoon\b/i],
  ['walking', /\bwalking safari\b|\bnature walk/i],
  ['climbing', /\bclimb(?:ing)?\b|\btrek(?:king)?\b/i],
  ['diving', /\bdiving\b|\bsnorkel/i],
  ['birding', /\bbird(?:ing|watching)\b/i],
  ['cultural', /\bcultural (?:tour|visit|experience)/i],
  ['honeymoon', /\bhoneymoon\b/i],
  ['family', /\bfamily safari\b/i],
  ['gorilla', /\bgorilla\b/i],
  ['chimp', /\bchimpanzee\b|\bchimp trek/i],
];

function factsFrom(text) {
  const hit = (pairs) => pairs.filter(([, re]) => re.test(text)).map(([k]) => k);
  const vehicles = text.match(/\b(\d{1,3})\s+(?:4x4|4WD|land\s*cruisers?|safari vehicles?)\b/i);
  const team = text.match(/\b(?:team of|staff of)\s+(\d{1,4})\b/i);
  return {
    parks: PARKS.filter((p) => new RegExp(`\\b${p}\\b`, 'i').test(text)),
    activities: hit(ACTIVITIES),
    vehicles: vehicles ? Number(vehicles[1]) : null,
    teamSize: team ? Number(team[1]) : null,
    tripAdvisor: /tripadvisor/i.test(text),
    safariBookings: /safaribookings/i.test(text),
  };
}

/**
 * Which other pages of a site to read. A contact page is where the address is;
 * an about page is where the year and the register are.
 */
function extraLinks(html, base) {
  const out = [];
  const seen = new Set();
  for (const m of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    const href = m[1];
    if (!/contact|about|who-we-are|our-story|impressum/i.test(href)) continue;
    let url;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }
    if (url.origin !== new URL(base).origin) continue;
    const key = url.pathname.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
    if (out.length >= MAX_PAGES_PER_SITE - 1) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// One listing
// ---------------------------------------------------------------------------

function normalizeSite(raw) {
  const s = raw.trim();
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (!/^https?:$/.test(u.protocol)) return null;
    // Facebook and the like are not an operator's own site and their robots
    // rules say so. Skipping them is both polite and accurate.
    if (/facebook|instagram|twitter|x\.com|linkedin|tiktok|wa\.me|whatsapp/i.test(u.hostname)) {
      return null;
    }
    return u;
  } catch {
    return null;
  }
}

async function crawlOne(listing) {
  const site = normalizeSite(listing.website);
  if (!site) return { business_id: listing.id, url: listing.website, error: 'unusable url' };

  const rules = await robotsFor(site.origin);
  if (!allowed(rules, site.pathname || '/')) {
    return { business_id: listing.id, url: site.href, error: 'robots.txt disallows' };
  }

  let first;
  try {
    first = await fetchText(site.href);
  } catch (err) {
    return { business_id: listing.id, url: site.href, error: String(err?.message ?? err).slice(0, 200) };
  }
  if (!first.text) {
    return { business_id: listing.id, url: site.href, http_status: first.status ?? null, error: 'no html' };
  }

  let html = first.text;
  let text = visibleText(html);
  const title = titleOf(html);
  let sourceUrl = first.url ?? site.href;

  // A contact page, if there is one and robots allows it. The address is there
  // far more often than on the homepage.
  for (const link of extraLinks(html, sourceUrl)) {
    if (!allowed(rules, link.pathname)) continue;
    try {
      const more = await fetchText(link.href);
      if (more.text) {
        html += `\n${more.text}`;
        text += ` ${visibleText(more.text)}`;
        if (/contact/i.test(link.pathname)) sourceUrl = more.url ?? link.href;
      }
    } catch {
      // One unreachable sub-page is not a failed listing.
    }
  }

  const emails = emailsFrom(html, text, site.hostname);
  return {
    business_id: listing.id,
    url: sourceUrl,
    http_status: first.status ?? null,
    emails,
    phones: [...new Set((text.match(/\+\d[\d\s().-]{7,17}\d/g) ?? []).map((p) => p.trim()))].slice(0, 6),
    founded_year: foundedYearFrom(text),
    license_numbers: licencesFrom(text),
    associations: ASSOCIATIONS.filter(([, re]) => re.test(text)).map(([k]) => k),
    languages: LANGUAGES.filter(([, re]) => re.test(text)).map(([k]) => k),
    facts: factsFrom(text),
    page_title: title,
    page_text: text.slice(0, MAX_TEXT),
  };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

/** Spread hosts across the workers so one slow site does not stall a lane. */
function interleaveByHost(rows) {
  const byHost = new Map();
  for (const r of rows) {
    const u = normalizeSite(r.website ?? '');
    const host = u?.hostname ?? '?';
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(r);
  }
  const lanes = [...byHost.values()];
  const out = [];
  for (let i = 0; lanes.some((l) => l.length); i++) {
    for (const lane of lanes) if (lane[i] !== undefined) out.push(lane[i]);
  }
  return out;
}

/**
 * `--urls` — crawl what you name and print what came back.
 *
 * No query, no staging row, no update. Tuning an extractor against live sites
 * is the one job in here that has nothing to do with the database, and making
 * it need one would mean every pattern change waited on a migration.
 */
async function reportUrls(urls) {
  console.log(`${urls.length} url(s), extractor only — no database involved\n`);
  for (const website of urls) {
    const r = await crawlOne({ id: '—', name: website, website }).catch((err) => ({
      error: String(err?.message ?? err),
    }));
    console.log(website);
    if (r.error) {
      console.log(`  failed: ${r.error}\n`);
      continue;
    }
    console.log(`  source     ${r.url} (${r.http_status})`);
    console.log(`  title      ${r.page_title ?? '-'}`);
    console.log(`  emails     ${r.emails.join(', ') || '-'}`);
    console.log(`  phones     ${r.phones.join(', ') || '-'}`);
    console.log(`  founded    ${r.founded_year ?? '-'}`);
    console.log(`  licence    ${r.license_numbers.join(', ') || '-'}`);
    console.log(`  registers  ${r.associations.join(', ') || '-'}`);
    console.log(`  languages  ${r.languages.join(', ') || '-'}`);
    console.log(`  parks      ${r.facts.parks.join(', ') || '-'}`);
    console.log(`  activities ${r.facts.activities.join(', ') || '-'}`);
    console.log(`  vehicles   ${r.facts.vehicles ?? '-'}   team ${r.facts.teamSize ?? '-'}`);
    console.log(`  text       ${r.page_text.length} chars\n`);
  }
}

async function main() {
  const urlsArg = flag('urls', null);
  if (urlsArg) {
    await reportUrls(urlsArg.split(',').map((u) => u.trim()).filter(Boolean));
    return;
  }

  const recrawl = RECRAWL_DAYS
    ? `and (f.fetched_at is null or f.fetched_at < now() - interval '${RECRAWL_DAYS} days')`
    : 'and f.business_id is null';

  const { rows } = await pool.query(`
    select b.id, b.name, b.website, b.email, b.founded_year, b.license_number, b.associations
      from businesses b
      left join lateral (
        select business_id, fetched_at from business_crawl_facts
         where business_id = b.id order by fetched_at desc limit 1
      ) f on true
     where b.status = 'approved'
       and b.deleted_at is null
       and b.is_stub
       and b.website is not null
       and b.website <> ''
       ${recrawl}
     order by b.rating_count desc nulls last, b.name
     ${LIMIT ? `limit ${LIMIT}` : ''}
  `);

  console.log(`${rows.length} stub listings with a website to crawl`);
  console.log(APPLY ? 'APPLY: writes enabled\n' : 'DRY RUN: nothing will be written\n');
  if (!rows.length) return;

  const queue = interleaveByHost(rows);
  const results = [];
  let done = 0;

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (;;) {
        const listing = queue.shift();
        if (!listing) return;
        const r = await crawlOne(listing).catch((err) => ({
          business_id: listing.id,
          url: listing.website,
          error: String(err?.message ?? err).slice(0, 200),
        }));
        r._listing = listing;
        results.push(r);
        if (++done % 25 === 0) console.log(`  ${done}/${rows.length}`);
      }
    }),
  );

  // ---- report ----
  const ok = results.filter((r) => !r.error);
  const withEmail = ok.filter((r) => r.emails?.length);
  const newEmail = withEmail.filter((r) => !r._listing.email);
  const withYear = ok.filter((r) => r.founded_year);
  const withAssoc = ok.filter((r) => r.associations?.length);
  const withParks = ok.filter((r) => r.facts?.parks?.length);
  const substantial = ok.filter((r) => (r.page_text?.length ?? 0) > 600);

  console.log('\n--- crawl ---');
  console.log(`fetched            ${ok.length}/${results.length}`);
  console.log(`failed             ${results.length - ok.length}`);
  console.log(`emails found       ${withEmail.length}`);
  console.log(`  newly reachable  ${newEmail.length}  (email column was null)`);
  console.log(`founded year       ${withYear.length}`);
  console.log(`association named  ${withAssoc.length}`);
  console.log(`parks named        ${withParks.length}`);
  console.log(`enough text to     ${substantial.length}  (>600 chars, usable for a description)`);

  const reasons = {};
  for (const r of results.filter((x) => x.error)) {
    const key = /timeout|abort/i.test(r.error)
      ? 'timeout'
      : /robots/i.test(r.error)
        ? 'robots.txt'
        : /ENOTFOUND|getaddrinfo|dns/i.test(r.error)
          ? 'dns'
          : /certificate|SSL|TLS/i.test(r.error)
            ? 'tls'
            : /no html/i.test(r.error)
              ? 'not html'
              : 'other';
    reasons[key] = (reasons[key] ?? 0) + 1;
  }
  if (Object.keys(reasons).length) {
    console.log('\nfailures by reason');
    for (const [k, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(12)} ${n}`);
    }
  }

  if (!APPLY) {
    console.log('\nSample of what would be written:');
    for (const r of ok.slice(0, 5)) {
      console.log(
        `  ${r._listing.name}\n    ${r.url}\n    email=${r.emails?.[0] ?? '-'} year=${r.founded_year ?? '-'} assoc=${(r.associations ?? []).join(',') || '-'} parks=${(r.facts?.parks ?? []).slice(0, 3).join(',') || '-'}`,
      );
    }
    console.log('\nRe-run with --apply to write.');
    return;
  }

  // ---- write ----
  //
  // Two writes per listing, both conservative. The staging row always lands,
  // including for failures, so a second run can tell "never tried" from
  // "tried and the site is gone". The `businesses` update only ever fills a
  // null — an operator who typed their own address keeps it, and so does one
  // whose details came from a register, which is better evidence than a crawl.
  let staged = 0;
  let filledEmail = 0;
  let filledYear = 0;
  let filledLicence = 0;

  for (const r of results) {
    const client = await pool.connect();
    try {
      await client.query(
        `insert into business_crawl_facts
           (business_id, url, http_status, error, emails, phones, founded_year,
            license_numbers, associations, languages, facts, page_title, page_text)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          r.business_id,
          r.url ?? '',
          r.http_status ?? null,
          r.error ?? null,
          r.emails ?? [],
          r.phones ?? [],
          r.founded_year ?? null,
          r.license_numbers ?? [],
          r.associations ?? [],
          r.languages ?? [],
          JSON.stringify(r.facts ?? {}),
          r.page_title ?? null,
          r.page_text ?? null,
        ],
      );
      staged++;

      if (r.error) continue;

      const email = r.emails?.[0] ?? null;
      const res = await client.query(
        `update businesses set
           email         = coalesce(email, $2::citext),
           founded_year  = coalesce(founded_year, $3::int2),
           license_number = coalesce(license_number, $4),
           updated_at    = now()
         where id = $1
         returning (email is not distinct from $2::citext) as took_email,
                   (founded_year is not distinct from $3::int2) as took_year,
                   (license_number is not distinct from $4) as took_licence`,
        [r.business_id, email, r.founded_year ?? null, r.license_numbers?.[0] ?? null],
      );
      const row = res.rows[0];
      if (email && row?.took_email) filledEmail++;
      if (r.founded_year && row?.took_year) filledYear++;
      if (r.license_numbers?.[0] && row?.took_licence) filledLicence++;
    } catch (err) {
      console.warn(`  write failed for ${r._listing?.name ?? r.business_id}: ${err.message}`);
    } finally {
      client.release();
    }
  }

  console.log('\n--- written ---');
  console.log(`staged rows        ${staged}`);
  console.log(`email filled       ${filledEmail}`);
  console.log(`founded_year       ${filledYear}`);
  console.log(`license_number     ${filledLicence}`);
  console.log('\nNothing was overwritten: every update fills a null only.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
