/**
 * Crawls the sitemap and checks what search engines check.
 *
 * Written for the 21 Nov 2026 SEO brief (T1, section 5). For a sample of every
 * sitemap section it fetches the page and reports:
 *
 *   status        every sitemap URL must answer 200
 *   canonical     present, and pointing at the page itself
 *   hreflang      every alternate answers 200 and lists this page back
 *                 (reciprocity), with an x-default
 *   title         present, and not shared with another sampled page
 *   h1            exactly one
 *   alt           content images with no alt attribute at all
 *   robots        noindex pages should not be in the sitemap
 *   time / size   server response time and HTML weight
 *
 * Runs against any deployment, so CI can point it at a Netlify preview:
 *
 *   node scripts/seo-audit.mjs                                   (live site, 6 per section)
 *   node scripts/seo-audit.mjs --base=https://deploy-preview-150--regal-crisp-bd37c7.netlify.app
 *   node scripts/seo-audit.mjs --per-section=40 --json=seo-report.json
 *
 * Sitemap <loc>s carry the production origin; they are rewritten to --base, and
 * so are hreflang and canonical URLs before they are fetched, so a preview is
 * judged on its own pages. Exit code 1 when any hard failure is found: a
 * non-200 sitemap URL or hreflang target, a missing or foreign canonical, a
 * one-way hreflang, or a page without exactly one H1.
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);

const PROD = 'https://exploretanzania.online';
const BASE = (args.base ?? PROD).replace(/\/$/, '');
const PER_SECTION = Number(args['per-section'] ?? 6);
const CONCURRENCY = Number(args.concurrency ?? 4);
const TIMEOUT_MS = Number(args.timeout ?? 45000);
// Previews publish an empty sitemap (indexing is off there), so the list of
// URLs comes from production unless told otherwise; the pages come from BASE.
const SITEMAP_ORIGIN = (args['sitemap-from'] ?? PROD).replace(/\/$/, '');
// Every page on a preview is noindex on purpose; only judge robots on prod.
const CHECK_ROBOTS = args['check-robots'] ? args['check-robots'] === 'true' : BASE === PROD;

// Pages are compared by path, whatever origin they print: a deploy preview
// has no site URL configured and writes http://localhost:3000 into its
// canonicals and hreflang, while production writes its own domain.
const pathOf = (url) => {
  try {
    const u = new URL(url, PROD);
    return u.pathname + u.search;
  } catch {
    return url;
  }
};
const toBase = (url) => BASE + pathOf(url);
// The home page is "/" in the sitemap and bare in its canonical; same page.
const norm = (url) => url.replace(/\/$/, '');
const toProd = (url) => norm(PROD + pathOf(url));

async function fetchText(url) {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: 'manual', signal: ctrl.signal, headers: { 'user-agent': 'explore-tanzania-seo-audit' } });
    const ttfb = Date.now() - started;
    const body = res.status === 200 ? await res.text() : '';
    return { status: res.status, location: res.headers.get('location'), body, ttfb, ms: Date.now() - started };
  } catch (err) {
    return { status: 0, location: null, body: '', ttfb: Date.now() - started, ms: Date.now() - started, error: String(err.message ?? err) };
  } finally {
    clearTimeout(timer);
  }
}

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'))?.[1] ?? null;
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function parsePage(html) {
  const head = html.split('</head>')[0] ?? html;
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const canonical = links.find((l) => /rel="canonical"/i.test(l));
  const alternates = links
    .filter((l) => /rel="alternate"/i.test(l) && /hreflang=/i.test(l))
    .map((l) => ({ lang: attr(l, 'hrefLang') ?? attr(l, 'hreflang'), href: decode(attr(l, 'href') ?? '') }));
  const robots = head.match(/<meta name="robots" content="([^"]+)"/i)?.[1] ?? null;
  const title = decode(head.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '');
  // Body only, and without <template>/<script> payloads, so streamed RSC data
  // and hidden fallbacks are not counted as rendered headings or images.
  const body = (html.split(/<body[^>]*>/i)[1] ?? '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<template[\s\S]*?<\/template>/gi, '');
  const h1 = (body.match(/<h1\b/gi) ?? []).length;
  const imgs = [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const noAlt = imgs.filter((i) => !/\salt=/i.test(i)).length;
  const emptyAlt = imgs.filter((i) => /\salt=""/i.test(i)).length;
  return {
    canonical: canonical ? decode(attr(canonical, 'href') ?? '') : null,
    alternates,
    robots,
    title,
    h1,
    imgs: imgs.length,
    noAlt,
    emptyAlt,
    bytes: Buffer.byteLength(html),
  };
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    }),
  );
  return out;
}

const sample = (arr, n) => {
  if (arr.length <= n) return arr;
  // Spread across the section rather than the first n, which are often all
  // one kind (the sitemap is ordered).
  const step = arr.length / n;
  return Array.from({ length: n }, (_, k) => arr[Math.floor(k * step)]);
};

// ---------------------------------------------------------------------------

const index = await fetchText(`${SITEMAP_ORIGIN}/sitemap.xml`);
if (index.status !== 200) {
  console.error(`sitemap.xml answered ${index.status} at ${SITEMAP_ORIGIN}`);
  process.exit(1);
}
const sections = locs(index.body);
const targets = [];
for (const s of sections) {
  const res = await fetchText(s.replace(PROD, SITEMAP_ORIGIN));
  const urls = locs(res.body);
  const name = s.split('/').pop().replace('.xml', '');
  for (const u of sample(urls, PER_SECTION)) targets.push({ section: name, url: u, total: urls.length });
  console.log(`  ${name.padEnd(14)} ${String(urls.length).padStart(5)} URLs, sampling ${Math.min(PER_SECTION, urls.length)}`);
}

console.log(`\nAuditing ${targets.length} pages on ${BASE} …\n`);

const pages = await pool(targets, CONCURRENCY, async (t) => {
  const res = await fetchText(toBase(t.url));
  const page = res.status === 200 ? parsePage(res.body) : null;
  return { ...t, status: res.status, location: res.location, ttfb: res.ttfb, ms: res.ms, error: res.error, page };
});

// hreflang targets, each fetched once.
const altCache = new Map();
const fetchAlt = (url) => {
  if (!altCache.has(url)) altCache.set(url, fetchText(toBase(url)).then((r) => ({ status: r.status, location: r.location, page: r.status === 200 ? parsePage(r.body) : null })));
  return altCache.get(url);
};

const failures = [];
const warnings = [];
const fail = (url, what) => failures.push(`${url.replace(PROD, '')}  ${what}`);
const warn = (url, what) => warnings.push(`${url.replace(PROD, '')}  ${what}`);
const titles = new Map();

for (const p of pages) {
  if (p.status !== 200) {
    fail(p.url, `status ${p.status}${p.location ? ` -> ${p.location}` : ''}${p.error ? ` (${p.error})` : ''}`);
    continue;
  }
  const pg = p.page;
  const self = norm(p.url);
  if (!pg.canonical) fail(self, 'no canonical');
  else if (toProd(pg.canonical) !== self) fail(self, `canonical points elsewhere: ${toProd(pg.canonical).replace(PROD, '')}`);
  if (CHECK_ROBOTS && pg.robots && /noindex/i.test(pg.robots)) fail(self, `in the sitemap but robots="${pg.robots}"`);
  if (pg.h1 !== 1) fail(self, `${pg.h1} <h1> elements`);
  if (!pg.title) fail(self, 'no <title>');
  else titles.set(pg.title, [...(titles.get(pg.title) ?? []), self]);
  if (pg.noAlt > 0) warn(self, `${pg.noAlt} <img> without an alt attribute`);

  if (pg.alternates.length > 0) {
    if (!pg.alternates.some((a) => a.lang === 'x-default')) fail(self, 'hreflang without x-default');
    const selfListed = pg.alternates.some((a) => toProd(a.href) === self);
    if (!selfListed) fail(self, 'hreflang does not list the page itself');
    for (const a of pg.alternates) {
      const target = toProd(a.href);
      if (target === self) continue;
      const r = await fetchAlt(target);
      if (r.status !== 200) {
        fail(self, `hreflang ${a.lang} -> ${target.replace(PROD, '')} answers ${r.status}${r.location ? ` -> ${r.location}` : ''}`);
        continue;
      }
      if (a.lang !== 'x-default' && !r.page.alternates.some((b) => toProd(b.href) === self)) {
        fail(self, `hreflang ${a.lang} -> ${target.replace(PROD, '')} does not link back`);
      }
    }
  }
}

for (const [title, urls] of titles) {
  if (urls.length > 1) warn(urls[0], `title shared by ${urls.length} sampled pages: "${title}"`);
}

// ---------------------------------------------------------------------------

const ok = pages.filter((p) => p.status === 200);
const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const p90 = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.9))];
};

console.log('section        pages  median TTFB  median KB  no-alt imgs');
const bySection = new Map();
for (const p of ok) bySection.set(p.section, [...(bySection.get(p.section) ?? []), p]);
for (const [name, ps] of bySection) {
  console.log(
    `${name.padEnd(14)} ${String(ps.length).padStart(5)}  ${String(median(ps.map((p) => p.ttfb))).padStart(8)} ms  ${String(Math.round(median(ps.map((p) => p.page.bytes)) / 1024)).padStart(7)}  ${String(ps.reduce((s, p) => s + p.page.noAlt, 0)).padStart(11)}`,
  );
}
console.log(`\nall            ${String(ok.length).padStart(5)}  median TTFB ${median(ok.map((p) => p.ttfb))} ms, p90 ${p90(ok.map((p) => p.ttfb))} ms`);
console.log(`hreflang targets checked: ${altCache.size}`);

if (warnings.length) {
  console.log(`\n${warnings.length} warnings:`);
  for (const w of warnings.slice(0, 40)) console.log(`  ! ${w}`);
}
if (failures.length) {
  console.log(`\n${failures.length} FAILURES:`);
  for (const f of failures) console.log(`  x ${f}`);
} else {
  console.log('\nNo failures.');
}

if (args.json) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(args.json, JSON.stringify({ base: BASE, failures, warnings, pages: pages.map(({ page, ...rest }) => ({ ...rest, ...(page ? { ...page, alternates: page.alternates.length } : {}) })) }, null, 2));
}

if (pages.length === 0) {
  console.error('No pages audited: the sitemap listed nothing. That is a failure, not a pass.');
  process.exit(1);
}
process.exit(failures.length ? 1 : 0);
