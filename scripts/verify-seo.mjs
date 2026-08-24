/**
 * SEO verification against a running server.
 *
 * Usage: node scripts/verify-seo.mjs [baseUrl]
 *
 * The checks that matter here cannot be done statically. An hreflang cluster is
 * only useful if every URL in it resolves and points back — Google discards the
 * whole cluster otherwise, so one wrong slug silently costs a page its links in
 * every other locale. That is exactly the bug this suite exists to catch, and it
 * is invisible to a type checker.
 */

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');

let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

const abs = (u) => (u.startsWith('http') ? u : base + u);
const rel = (u) => u.replace(base, '') || '/';

async function getHtml(path) {
  const res = await fetch(abs(path), { redirect: 'manual' });
  return { status: res.status, html: res.ok ? await res.text() : '' };
}

/** Pulls hreflang pairs out of a rendered page. */
function alternatesOf(html) {
  const out = {};
  const re = /<link[^>]+rel="alternate"[^>]*>/g;
  for (const tag of html.match(re) ?? []) {
    const lang = tag.match(/hrefLang="([^"]+)"/i)?.[1] ?? tag.match(/hreflang="([^"]+)"/i)?.[1];
    const href = tag.match(/href="([^"]+)"/)?.[1];
    if (lang && href) out[lang] = href;
  }
  return out;
}

function canonicalOf(html) {
  return html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1] ?? null;
}

function jsonLdOf(html) {
  const blocks = [];
  const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      blocks.push({ __parseError: true });
    }
  }
  return blocks;
}

/**
 * Pages representing every template that carries translated slugs.
 *
 * Business, package and combination URLs are discovered from the live site
 * rather than hardcoded. The demo listings these used to name have been deleted,
 * and a 404 advertises no hreflang at all — so the assertions would have passed
 * while testing nothing, which is worse than failing.
 */
async function discover(listPath, pattern) {
  try {
    const html = await (await fetch(base + listPath)).text();
    return html.match(pattern)?.[0] ?? null;
  } catch {
    return null;
  }
}

const SAMPLES = [
  ['/destinations/zanzibar', 'destination (slug differs per locale)'],
  ['/destinations/kilimanjaro', 'destination (Kilimandscharo/Kilimangiaro)'],
  ['/guides/tanzania-safari-cost', 'guide (slug differs per locale)'],
  [await discover('/directory', /\/business\/[a-z0-9-]+/), 'business (shared slug)'],
  [await discover('/compare', /\/packages\/[a-z0-9-]+/), 'package (shared slug)'],
  [await discover('/safaris', /\/safaris\/[a-z0-9-]+/), 'category x destination combination'],
  ['/', 'homepage'],
];

async function main() {
  console.log('\n--- Every advertised hreflang URL must resolve ---');

  for (const [path, label] of SAMPLES) {
    if (!path) { console.log(`  SKIP  ${label} — no instance on the live site`); continue; }
    const { status, html } = await getHtml(path);
    if (status !== 200) {
      check(`${label}: page loads`, false, `HTTP ${status} for ${path}`);
      continue;
    }

    const alts = alternatesOf(html);
    const langs = Object.keys(alts).filter((l) => l !== 'x-default');

    if (langs.length === 0) {
      check(`${label}: emits alternates`, false, path);
      continue;
    }

    const broken = [];
    for (const [lang, href] of Object.entries(alts)) {
      const res = await fetch(abs(href), { redirect: 'manual' });
      if (res.status !== 200) broken.push(`${lang}=${rel(href)} (${res.status})`);
    }

    check(
      `${label}: all ${Object.keys(alts).length} alternates resolve`,
      broken.length === 0,
      broken.join(', '),
    );
  }

  console.log('\n--- Clusters must reciprocate ---');

  for (const [path, label] of SAMPLES.slice(0, 4)) {
    if (!path) { console.log(`  SKIP  ${label} — no instance on the live site`); continue; }
    const { html } = await getHtml(path);
    const alts = alternatesOf(html);
    const selfCanonical = canonicalOf(html);

    check(
      `${label}: canonical is self-referential`,
      selfCanonical !== null && rel(selfCanonical) === path,
      `${rel(selfCanonical ?? '')} vs ${path}`,
    );

    // Follow one alternate and confirm it advertises the same set back.
    const other = Object.entries(alts).find(([l, h]) => l !== 'x-default' && rel(h) !== path);
    if (!other) continue;

    const { html: otherHtml, status } = await getHtml(rel(other[1]));
    if (status !== 200) continue;

    const backAlts = alternatesOf(otherHtml);
    const pointsBack = Object.values(backAlts).some((h) => rel(h) === path);
    check(`${label}: ${other[0]} version links back`, pointsBack, rel(other[1]));

    check(
      `${label}: both sides advertise the same locales`,
      Object.keys(alts).sort().join(',') === Object.keys(backAlts).sort().join(','),
      `${Object.keys(alts).join('/')} vs ${Object.keys(backAlts).join('/')}`,
    );
  }

  console.log('\n--- Structured data ---');

  for (const [path, label] of SAMPLES) {
    if (!path) { console.log(`  SKIP  ${label} — no instance on the live site`); continue; }
    const { html } = await getHtml(path);
    const blocks = jsonLdOf(html);
    if (blocks.length === 0) continue;

    check(
      `${label}: JSON-LD parses`,
      blocks.every((b) => !b.__parseError),
      `${blocks.length} block(s)`,
    );

    const types = blocks.flatMap((b) =>
      Array.isArray(b['@graph'])
        ? b['@graph'].map((g) => g['@type'])
        : [b['@type']],
    );
    check(`${label}: declares a schema type`, types.filter(Boolean).length > 0,
      types.filter(Boolean).join(', '));
  }

  console.log('\n--- robots and sitemap ---');

  const robots = await fetch(`${base}/robots.txt`);
  const robotsBody = robots.ok ? await robots.text() : '';
  check('robots.txt is served', robots.status === 200, `HTTP ${robots.status}`);

  const indexingOn = !/Disallow: \/\s*$/m.test(robotsBody.trim());
  console.log(`  (indexing is currently ${indexingOn ? 'ENABLED' : 'DISABLED'})`);

  // Next does not emit an index for named sections, so robots.txt is the index.
  const children = [...robotsBody.matchAll(/^Sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  check('robots.txt advertises the sitemap sections', children.length > 0,
    `${children.length} sections`);

  {

    let totalUrls = 0;
    let brokenSitemapUrls = 0;

    for (const child of children) {
      const res = await fetch(abs(child));
      if (!res.ok) {
        brokenSitemapUrls++;
        continue;
      }
      const body = await res.text();
      const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      totalUrls += locs.length;

      // Spot-check the first URL in each section actually resolves. Checking all
      // of them would be several hundred requests for little extra signal.
      if (locs[0]) {
        const probe = await fetch(abs(locs[0]), { redirect: 'manual' });
        if (probe.status !== 200) {
          brokenSitemapUrls++;
          console.log(`        ${rel(child)}: first URL ${rel(locs[0])} -> ${probe.status}`);
        }
      }
    }

    check('every child sitemap loads and its first URL resolves',
      brokenSitemapUrls === 0, `${brokenSitemapUrls} problem(s)`);
    console.log(`  (${totalUrls} URLs across ${children.length} sitemaps)`);
  }

  await geographyTests();
  await lastmodTests();
  await answerEngineTests();
}


/**
 * Geography in structured data.
 *
 * containedInPlace was hardcoded to Tanzania on every destination page. That was
 * true of every row when it was written and false for two thirds of them once
 * Kenya, Uganda and Rwanda went in — and a type checker cannot see it, because
 * the wrong answer is a perfectly valid string.
 */
async function geographyTests() {
  console.log('\n--- Destinations declare the right country ---');

  const sitemapRes = await fetch(abs('/sitemap/destinations.xml'));
  if (!sitemapRes.ok) {
    check('destinations sitemap loads', false, `HTTP ${sitemapRes.status}`);
    return;
  }
  const xml = await sitemapRes.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  // One known destination per covered country, so a regression in any single
  // country's rows is caught rather than averaged away.
  const probes = [
    { slug: 'serengeti', country: 'Tanzania' },
    { slug: 'maasai-mara', country: 'Kenya' },
    { slug: 'bwindi-impenetrable-national-park', country: 'Uganda' },
    { slug: 'volcanoes-national-park', country: 'Rwanda' },
  ];

  let wrong = 0;
  let checked = 0;

  for (const probe of probes) {
    const url = locs.find((l) => l.endsWith(`/destinations/${probe.slug}`));
    if (!url) {
      console.log(`  SKIP  ${probe.slug} — not in the sitemap`);
      continue;
    }
    const { status, html } = await getHtml(rel(url));
    if (status !== 200) {
      wrong++;
      console.log(`        ${probe.slug} -> HTTP ${status}`);
      continue;
    }
    checked++;

    const dest = jsonLdOf(html).find((b) => b['@type'] === 'TouristDestination');
    // containedInPlace is either a Country, or an AdministrativeArea wrapping
    // one. Both shapes are valid; only the country name is being asserted here.
    const place = dest?.containedInPlace;
    const named =
      place?.['@type'] === 'Country' ? place.name : (place?.containedInPlace?.name ?? null);

    if (named !== probe.country) {
      wrong++;
      console.log(`        ${probe.slug} claims "${named}", expected "${probe.country}"`);
    }
  }

  check(
    'every probed destination names its real country',
    wrong === 0 && checked > 0,
    `${checked} checked, ${wrong} wrong`,
  );

  // The publisher-level claim. areaServed said Tanzania alone, which tells a
  // crawler not to consider this site for three quarters of its own pages.
  const { html: home } = await getHtml('/');
  const graph = jsonLdOf(home).flatMap((b) => b['@graph'] ?? [b]);
  const org = graph.find((n) => n['@type'] === 'Organization');
  const served = []
    .concat(org?.areaServed ?? [])
    .map((a) => a?.name)
    .filter(Boolean);

  check(
    'Organization areaServed covers more than one country',
    served.length > 1,
    served.join(', ') || 'none declared',
  );
}

/**
 * lastmod has to mean something.
 *
 * Static routes and combination pages stamped `new Date()`, so every crawl saw a
 * fresh timestamp on pages that had not changed. Google's response to a lastmod
 * it finds unreliable is to ignore lastmod for the whole site, so this is not a
 * cosmetic problem — it degrades the sections that compute it honestly.
 *
 * Fetching the same sitemap twice is the only way to see it: a single fetch
 * looks perfectly plausible.
 */
async function lastmodTests() {
  console.log('\n--- lastmod is stable across fetches ---');

  const readLastmods = async (section) => {
    const res = await fetch(abs(`/sitemap/${section}.xml`), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const body = await res.text();
    return [...body.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
  };

  const sections = ['static', 'combinations', 'destinations'];
  let unstable = 0;
  let compared = 0;

  for (const section of sections) {
    const first = await readLastmods(section);
    if (!first?.length) {
      console.log(`  SKIP  ${section} — no lastmod values to compare`);
      continue;
    }
    const second = await readLastmods(section);
    compared++;

    const changed = first.filter((v, i) => v !== second?.[i]).length;
    if (changed > 0) {
      unstable++;
      console.log(
        `        ${section}: ${changed}/${first.length} lastmod values moved between two fetches`,
      );
    }
  }

  check(
    'lastmod does not change between identical fetches',
    unstable === 0 && compared > 0,
    `${compared} section(s) compared`,
  );

  // A lastmod in the future is the other way to lose the signal.
  const all = await readLastmods('destinations');
  const future = (all ?? []).filter((v) => new Date(v).getTime() > Date.now() + 60_000);
  check('no lastmod is dated in the future', future.length === 0, `${future.length} ahead of now`);
}

/**
 * The files answer engines read.
 *
 * llms.txt described a "Tanzania-focused" directory for weeks after it covered
 * four countries, and pointed at demo listings that had been deleted. Stale
 * facts in the one document written specifically to be believed.
 */
async function answerEngineTests() {
  console.log('\n--- llms.txt and llms-full.txt ---');

  const res = await fetch(abs('/llms.txt'));
  check('llms.txt is served', res.ok, `HTTP ${res.status}`);
  if (!res.ok) return;

  const txt = await res.text();

  // Every country with destinations must be named. The file is generated from
  // the same query the site uses, so a mismatch means the generation broke.
  const countries = ['Tanzania', 'Kenya', 'Uganda', 'Rwanda'];
  const missing = countries.filter((c) => !txt.includes(c));
  check(
    'llms.txt names every covered country',
    missing.length === 0,
    missing.length ? `missing ${missing.join(', ')}` : countries.join(', '),
  );

  check(
    'llms.txt groups destinations by country',
    countries.every((c) => txt.includes(`### ${c}`)),
  );

  check('llms.txt no longer advertises demo listings', !/demo data/i.test(txt));

  check('llms.txt points at the full guide text', txt.includes('/llms-full.txt'));

  const full = await fetch(abs('/llms-full.txt'));
  check('llms-full.txt is served', full.ok, `HTTP ${full.status}`);
  if (!full.ok) return;

  const fullTxt = await full.text();
  const guideHeadings = [...fullTxt.matchAll(/^## (.+)$/gm)].length;
  const sources = [...fullTxt.matchAll(/^Source: (\S+)$/gm)].map((m) => m[1]);

  check(
    'llms-full.txt contains guide bodies',
    fullTxt.length > 5000,
    `${(fullTxt.length / 1024).toFixed(0)} KB`,
  );

  // One ## per guide. More means a body's own headings were not demoted, and its
  // sections are being presented as separate documents.
  check(
    'each guide heading matches one source link',
    guideHeadings === sources.length,
    `${guideHeadings} headings, ${sources.length} sources`,
  );

  let brokenSource = 0;
  for (const src of sources.slice(0, 3)) {
    const probe = await fetch(src, { redirect: 'manual' });
    if (probe.status !== 200) brokenSource++;
  }
  check('cited source URLs resolve', brokenSource === 0, `${brokenSource} broken`);
}

try {
  await main();
} catch (err) {
  fail++;
  console.error('\nAborted:', err.message);
} finally {
  console.log(`\n${'='.repeat(52)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  console.log('='.repeat(52) + '\n');
  if (fail > 0) process.exitCode = 1;
}
