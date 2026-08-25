import { pool } from './db.mjs';

/**
 * Gives a listing a cover from its own website's Open Graph image.
 *
 *   node scripts/backfill-og-images.mjs [--dry] [--limit N]
 *
 * The Maps import covered the listings it found. The ones seeded from the
 * licensing registers were not on that crawl, and several hundred of them have
 * a name, a phone number and a website but no picture — which on a card means
 * the generated placeholder.
 *
 * og:image is the one image a site publishes specifically so that other sites
 * can show it when linking. Using it for a directory entry is the purpose it
 * was defined for, and it is the operator's own photograph of their own
 * business rather than a stranger's snapshot.
 *
 * Referenced, not copied, like everything else here: the row holds a URL and
 * the file stays on the operator's server.
 *
 * No Apify, no API key, no budget. Just the sites the register already told us
 * about.
 */

const DRY = process.argv.includes('--dry');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

/** Enough for a slow host on a bad link, short enough not to stall the run. */
const TIMEOUT_MS = 12_000;
const CONCURRENCY = 12;

const META = [
  /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
  /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
];

function absolutise(url, base) {
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}

/** Rejects the things that are technically images but never a useful cover. */
function usable(url) {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  if (/\.svg(\?|$)/i.test(url)) return false;
  // Tracking pixels and spacer gifs turn up in og:image more often than you
  // would hope.
  if (/(1x1|pixel|spacer|blank)\.(gif|png)/i.test(url)) return false;
  if (url.length > 500) return false;
  return true;
}

/**
 * Pages worth a second look when the homepage has no og:image.
 *
 * A first pass over the homepage alone found one in four. Small operator sites
 * often carry the tag on an interior page instead — the gallery or the about
 * page is where a template drops it — and several of the misses were a homepage
 * that timed out rather than one with nothing on it.
 */
const FALLBACK_PATHS = ['', '/about', '/about-us', '/gallery', '/tours', '/safaris'];

async function fetchOgImageDeep(site) {
  for (const path of FALLBACK_PATHS) {
    let target;
    try {
      target = new URL(path, site).toString();
    } catch {
      return null;
    }
    const found = await fetchOgImage(target);
    if (found) return found;
  }
  return null;
}

async function fetchOgImage(site) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(site, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // Identifying the crawler is the polite minimum, and some hosts refuse
        // a request with no user agent at all.
        'User-Agent': 'ExploreTanzaniaBot/1.0 (+https://www.exploretanzania.online)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) return null;

    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('html')) return null;

    // The head is all that matters and some of these pages are enormous.
    const html = (await res.text()).slice(0, 200_000);

    for (const pattern of META) {
      const m = html.match(pattern);
      if (m?.[1]) {
        const abs = absolutise(m[1].trim(), res.url);
        if (usable(abs)) return abs;
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const client = await pool.connect();

try {
  const { rows: targets } = await client.query(
    `select id, slug, name, website
       from businesses
      where status = 'approved'
        and deleted_at is null
        and cover_image_url is null
        and website is not null
        and website <> ''
      order by name`,
  );

  const work = targets.slice(0, LIMIT);
  console.log(`\n  ${work.length} listings with a website and no cover\n`);

  let found = 0;
  let missed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < work.length) {
      const row = work[cursor++];
      const image = await fetchOgImageDeep(row.website);

      if (!image) {
        missed++;
        continue;
      }

      found++;
      if (!DRY) {
        await client.query(
          'update businesses set cover_image_url = $2 where id = $1 and cover_image_url is null',
          [row.id, image],
        );
        await client.query(
          `insert into media (business_id, kind, bucket, storage_path, public_url, alt_text, sort_order)
           values ($1,'gallery','website',$2,$3,$4,0)
           on conflict do nothing`,
          [row.id, `website/${row.slug}/0`, image, row.name],
        );
      }

      if (found % 25 === 0) {
        console.log(`  ${found} found / ${found + missed} tried`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\n  covers found   ${found}`);
  console.log(`  no og:image    ${missed}`);
  if (DRY) console.log('\n  DRY RUN — nothing written\n');
} catch (err) {
  console.error('\n  Failed:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
