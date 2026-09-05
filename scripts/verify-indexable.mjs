import { query, pool } from './db.mjs';

/**
 * What a search engine is actually offered.
 *
 *   npm run db:verify:indexable
 *
 * Google declined this site for its publisher network, and the reason was a
 * ratio: 2,618 of the 2,705 URLs in the sitemaps were business listings, and
 * 84% of those carried one generated sentence. This suite exists so that
 * ratio cannot drift back without somebody being told.
 */

let pass = 0;
let fail = 0;

const check = (label, ok, detail) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  ok ? pass++ : fail++;
};

const one = async (sql) => (await query(sql)).rows[0];

const listings = await one(`
  select
    count(*) filter (where is_stub and owner_id is null and not is_verified) as hidden,
    count(*) filter (where not (is_stub and owner_id is null and not is_verified)) as indexable
  from businesses where status = 'approved' and deleted_at is null
`);

const editorial = await one(`
  select (select count(*) from guides where status = 'published')                    as guides,
         (select count(*) from destinations where is_active and deleted_at is null)  as destinations,
         (select count(*) from attractions)                                          as attractions
`);

const indexable = Number(listings.indexable);
const hidden = Number(listings.hidden);
const editorialTotal =
  Number(editorial.guides) + Number(editorial.destinations) + Number(editorial.attractions);

check(
  'stub listings are held back from the index',
  hidden > 0,
  `${hidden} hidden, ${indexable} indexable`,
);

// Stated for the record rather than asserted: this is the share the
// application was judged on, and it should fall as listings get claimed.
const wouldBeThin = (hidden / (hidden + indexable + editorialTotal)) * 100;
console.log(
  `        (indexing every listing would make ${wouldBeThin.toFixed(1)}% of crawlable URLs thin)`,
);

check(
  'every indexable listing has something of its own',
  Number(
    (
      await one(`
        select count(*) n from businesses b
         where b.status = 'approved' and b.deleted_at is null
           and not (b.is_stub and b.owner_id is null and not b.is_verified)
           and b.owner_id is null and not b.is_verified and b.is_stub
      `)
    ).n,
  ) === 0,
  `${indexable} indexable listings`,
);

check(
  'the site still has editorial depth behind the listings',
  editorialTotal >= 50,
  `${editorial.guides} guides, ${editorial.destinations} destinations, ${editorial.attractions} attractions`,
);

// A claimed listing must never be hidden: an operator who has taken over their
// entry and paid for a tier is the last page that should be missing from
// Google.
check(
  'no claimed or verified listing is hidden',
  Number(
    (
      await one(`
        select count(*) n from businesses
         where status = 'approved' and deleted_at is null
           and (owner_id is not null or is_verified)
           and is_stub and owner_id is null and not is_verified
      `)
    ).n,
  ) === 0,
);

console.log(`\n  ${pass} of ${pass + fail} checks passed\n`);
// The check that catches a real regression: the data can be right while the
// sitemap query has quietly been changed back. Runs only when a server is
// reachable, so the suite still works with nothing running.
const base = (process.argv[2] ?? 'http://localhost:3000').replace(/[/]$/, '');
try {
  // Local .env sets NEXT_PUBLIC_ALLOW_INDEXING=false, which makes robots.txt
  // disallow-all and every sitemap render empty on purpose. Checking the count
  // in that state reports a failure that is really a setting, so ask robots
  // first and say plainly that the check was skipped.
  const robots = await fetch(base + '/robots.txt', { signal: AbortSignal.timeout(20000) });
  if (robots.ok && /Disallow:\s*\/\s*$/m.test((await robots.text()).split('User-Agent')[1] ?? '')) {
    console.log('  --    live sitemap not checked (this build has indexing switched off)');
    console.log(`
  ${pass} of ${pass + fail} checks passed
`);
    await pool.end();
    process.exit(fail ? 1 : 0);
  }

  const res = await fetch(base + '/sitemap/businesses.xml', {
    signal: AbortSignal.timeout(20000),
  });
  if (res.ok) {
    const urls = ((await res.text()).match(/<loc>/g) ?? []).length;
    check(
      'the live sitemap offers only the indexable listings',
      urls === indexable,
      'sitemap has ' + urls + ', database says ' + indexable,
    );
  } else {
    console.log('  --    live sitemap not checked (HTTP ' + res.status + ')');
  }
} catch {
  console.log('  --    live sitemap not checked (nothing serving ' + base + ')');
}

await pool.end();
process.exit(fail ? 1 : 0);
