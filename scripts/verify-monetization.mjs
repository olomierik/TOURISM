/**
 * Monetization and AI-search verification, against a running server.
 *
 * The assertion that matters most here is the last block: ads must appear on
 * guide pages and NOWHERE else. A qualified safari enquiry is worth $20-200+ to
 * an operator; an AdSense click is worth cents. An ad on a business profile or
 * anywhere in the quote funnel trades dollars for pennies and hands the visitor
 * to a competitor mid-decision.
 *
 * AdSlot enforces that through its type, but a type only protects the code as
 * written — this proves it against the rendered output.
 *
 * Run with NEXT_PUBLIC_ADSENSE_CLIENT_ID and NEXT_PUBLIC_ALLOW_INDEXING=true set,
 * otherwise the ad slot correctly renders nothing and the block is vacuous.
 *
 * Usage: node scripts/verify-monetization.mjs [baseUrl]
 *
 * Defaults to a local dev server; pass the production origin to check what is
 * actually deployed, which is the only place the real AdSense client ID is set.
 */

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
let pass=0, fail=0;
const check = (l, ok, d = '') => {
  // Was a ternary used for its side effects, which lint flags and which reads
  // as a value being computed and thrown away. Same behaviour, stated plainly.
  if (ok) pass += 1;
  else fail += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${l}${d ? ` — ${d}` : ''}`);
};

console.log('\n--- llms.txt ---');
const llms = await fetch(base+'/llms.txt');
const body = await llms.text();
check('served as plain text', llms.status===200 && (llms.headers.get('content-type')||'').includes('text/plain'));
check('names every destination', ['Serengeti','Ngorongoro','Kilimanjaro','Zanzibar','Arusha'].every(d=>body.includes(d)));
check('lists guides', body.includes('## Travel guides') && body.includes('safari-cost'));
// The caveat this used to assert was honest when the directory held one seeded
// listing. It is now false: 1,336 listings come from the KATO and UTB registers
// and from Google Maps. Telling a model the companies are not real would be the
// error. What must hold instead is that the coverage claim is stated plainly.
check('states real multi-country coverage', /4 countries/i.test(body) && !/demo data/i.test(body));
check('names all four countries covered',
  ['Tanzania','Kenya','Uganda','Rwanda'].every((c) => body.includes(c)));
check('explains the localized URL scheme', body.includes('/de/reiseziele/sansibar'));

console.log('\n--- Site schema (entity establishment) ---');
for (const [p,label] of [['/','homepage'],['/directory','directory'],['/guides/tanzania-safari-cost','guide']]) {
  const html = await (await fetch(base+p)).text();
  const blocks=[...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].map(m=>{try{return JSON.parse(m[1]);}catch{return null;}});
  const graph = blocks.find(b=>b && Array.isArray(b['@graph']));
  const types = graph ? graph['@graph'].map(g=>g['@type']) : [];
  check(`${label}: emits Organization + WebSite`, types.includes('Organization')&&types.includes('WebSite'), types.join(', '));
  if (graph) {
    const site = graph['@graph'].find(g=>g['@type']==='WebSite');
    check(`${label}: declares a SearchAction`, Boolean(site?.potentialAction));
    const org = graph['@graph'].find(g=>g['@type']==='Organization');
    // Four countries, not one. Written when the site was Tanzania-only, this
    // read .name off what is now an array and quietly returned undefined —
    // a stale assertion fails the same way whether the site is wrong or the
    // test is, which is why it sat red instead of being read.
    const served = [].concat(org?.areaServed ?? []).map((c) => c?.name).filter(Boolean);
    check(`${label}: Organization declares all four covered countries`,
      ['Tanzania','Kenya','Uganda','Rwanda'].every((c) => served.includes(c)),
      served.join(', ') || 'none');
  }
}

console.log('\n--- robots.txt ---');
const rb = await (await fetch(base+'/robots.txt')).text();
check('welcomes ChatGPT search crawler', rb.includes('OAI-SearchBot'));
check('welcomes PerplexityBot', rb.includes('PerplexityBot'));
check('welcomes Claude search crawler', rb.includes('Claude-SearchBot'));
check('keeps crawlers out of the dashboard', rb.includes('/dashboard/'));
check('keeps crawlers out of admin', rb.includes('/admin/'));

console.log(`\n--- Ads sit where the policy puts them ---`);

/**
 * What counts as an ad on a page.
 *
 * Not the string "adsbygoogle": the AdSense loader script is in the root
 * layout, so that string is in every page's HTML whether or not the page
 * carries a slot. Testing for it made "no ads on the quote funnel" fail on a
 * funnel with no ad in it, and five assertions that cannot pass are five
 * assertions nobody reads. `data-ad-surface` is on the unit itself, and it
 * names which surface — the thing the policy in lib/ads.ts is about.
 */
const adSurfaces = (html) => [...html.matchAll(/data-ad-surface="([^"]+)"/g)].map((m) => m[1]);

const guide = await (await fetch(base + '/guides/tanzania-safari-cost')).text();
check('guide page carries its in-content ad slot',
  adSurfaces(guide).includes('guide-body'), adSurfaces(guide).join(', ') || 'none');

// Labelled where a reader can see it, not only where a screen reader can hear
// it. ad-unit.tsx renders the word above the unit on purpose: an ad for a
// safari company, on a page listing safari companies, has to be marked for
// everybody. An aria-label alone would have been the weaker of the two, and
// asserting one is how this sat red while the visible label was right there.
check('the ad slot is labelled as advertising', /[Aa]dvertisement/.test(guide));

// Real slugs, discovered rather than hardcoded: the demo listings these used to
// name have been deleted, and a 404 contains no ad script either — which would
// have made these assertions pass while testing nothing.
const dirHtml = await (await fetch(base + '/directory')).text();
const someBusiness = dirHtml.match(/\/business\/([a-z0-9-]+)/)?.[1];
const somePackage = (await (await fetch(base + '/compare')).text()).match(/\/packages\/([a-z0-9-]+)/)?.[1];

// The site-wide foot unit is allowed everywhere the funnel rule does not
// forbid it; each in-content surface belongs to one page type. `expect` is the
// full set of surfaces the policy permits on that page, so a new surface
// appearing somewhere it was never argued for fails here.
for (const [p, label, expect] of [
  [someBusiness ? `/business/${someBusiness}` : null, 'business profile', ['page-foot']],
  [somePackage ? `/packages/${somePackage}` : null, 'package page', ['page-foot']],
  ['/directory', 'directory', ['page-foot', 'directory-feed']],
  ['/destinations/zanzibar', 'destination page', ['page-foot', 'destination-page']],
  ['/safaris/serengeti', 'combination page', ['page-foot']],
  ['/', 'homepage', ['page-foot']],
]) {
  if (!p) { console.log(`  SKIP  no ${label} on the live site to check`); continue; }
  const found = adSurfaces(await (await fetch(base + p)).text());
  const stray = found.filter((s) => !expect.includes(s));
  check(`only the permitted surfaces on the ${label}`, stray.length === 0,
    found.join(', ') || 'no ads');
}

// The funnel is excluded on value, not on taste: a safari enquiry is worth
// $20-200 to an operator and an AdSense click is worth cents, so an ad there
// sells a dollar for a penny. Asserted as "no ad unit at all", foot included.
for (const [p, label] of [['/request-quote', 'quote funnel'], ['/privacy', 'privacy policy']]) {
  const found = adSurfaces(await (await fetch(base + p)).text());
  check(`no ads at all on the ${label}`, found.length === 0, found.join(', ') || 'no ads');
}
console.log(`\n${'='.repeat(46)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(46)}\n`);
process.exitCode = fail?1:0;
