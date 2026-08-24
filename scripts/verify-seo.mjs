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
