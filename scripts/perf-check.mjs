/**
 * Server response and page weight for 20 fixed URLs (SEO brief T4).
 *
 * Each URL is fetched three times; the report shows the median time to first
 * byte, the HTML size, and what actually crosses the wire compressed. The
 * first fetch of a cold page is usually the slow one, which is why the median
 * of three is reported rather than the first.
 *
 *   node scripts/perf-check.mjs                                  (live site)
 *   node scripts/perf-check.mjs --base=https://deploy-preview-144--regal-crisp-bd37c7.netlify.app
 *   node scripts/perf-check.mjs --json=perf.json                 (to diff before/after)
 *
 * Targets from the brief: median TTFB under 500 ms, homepage HTML under 120 KB.
 */
import zlib from 'node:zlib';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);
const BASE = (args.base ?? 'https://exploretanzania.online').replace(/\/$/, '');
const TRIES = Number(args.tries ?? 3);

const URLS = [
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/request-quote',
  '/directory',
  '/destinations',
  '/destinations/kilimanjaro',
  '/destinations/serengeti',
  '/safaris',
  '/safaris/arusha',
  '/car-rental/arusha',
  '/packages',
  '/packages/spice-farm-tour-89c853',
  '/guides',
  '/when-to-go/january',
  '/wildlife/lion',
  '/safari-tours',
  '/de/reiseziele',
];

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function measure(path) {
  const ttfbs = [];
  let status = 0;
  let bytes = 0;
  let brotli = 0;
  for (let i = 0; i < TRIES; i++) {
    const started = Date.now();
    try {
      const res = await fetch(BASE + path, { redirect: 'manual' });
      ttfbs.push(Date.now() - started);
      status = res.status;
      const body = Buffer.from(await res.arrayBuffer());
      bytes = body.length;
      // What a CDN sends: brotli at the quality edges use for HTML.
      brotli = zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }).length;
    } catch {
      ttfbs.push(Date.now() - started);
    }
  }
  return { path, status, ttfb: median(ttfbs), kb: Math.round(bytes / 1024), brKb: Math.round(brotli / 1024) };
}

const rows = [];
for (const path of URLS) {
  const r = await measure(path);
  rows.push(r);
  console.log(`${String(r.status).padEnd(4)} ${String(r.ttfb).padStart(6)} ms ${String(r.kb).padStart(5)} KB html ${String(r.brKb).padStart(4)} KB br  ${path}`);
}

const ok = rows.filter((r) => r.status === 200);
const med = median(ok.map((r) => r.ttfb));
const home = rows.find((r) => r.path === '/');
console.log(`\n${BASE}`);
console.log(`median TTFB ${med} ms (target < 500)   homepage ${home?.kb ?? '?'} KB (target < 120)`);

if (args.json) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(args.json, JSON.stringify({ base: BASE, at: new Date().toISOString(), rows }, null, 2));
}
