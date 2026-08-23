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
const check=(l,ok,d='')=>{ok?pass++:fail++;console.log(`  ${ok?'PASS':'FAIL'}  ${l}${d?` — ${d}`:''}`);};

console.log('\n--- llms.txt ---');
const llms = await fetch(base+'/llms.txt');
const body = await llms.text();
check('served as plain text', llms.status===200 && (llms.headers.get('content-type')||'').includes('text/plain'));
check('names every destination', ['Serengeti','Ngorongoro','Kilimanjaro','Zanzibar','Arusha'].every(d=>body.includes(d)));
check('lists guides', body.includes('## Travel guides') && body.includes('safari-cost'));
check('states the demo-data caveat', body.includes('demo data') && body.includes('not real companies'));
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
    check(`${label}: Organization declares areaServed Tanzania`, org?.areaServed?.name==='Tanzania');
  }
}

console.log('\n--- robots.txt ---');
const rb = await (await fetch(base+'/robots.txt')).text();
check('welcomes ChatGPT search crawler', rb.includes('OAI-SearchBot'));
check('welcomes PerplexityBot', rb.includes('PerplexityBot'));
check('welcomes Claude search crawler', rb.includes('Claude-SearchBot'));
check('keeps crawlers out of the dashboard', rb.includes('/dashboard/'));
check('keeps crawlers out of admin', rb.includes('/admin/'));

console.log('\n--- Ads are confined to guides ---');
const guide = await (await fetch(base+'/guides/tanzania-safari-cost')).text();
check('guide page carries an ad slot', guide.includes('adsbygoogle'));
check('ad slot is labelled for screen readers', guide.includes('aria-label="Advertisement"'));
for (const [p,label] of [['/business/demo-serengeti-plains-safaris','business profile'],
                         ['/packages/demo-serengeti-migration-7-day','package page'],
                         ['/directory','directory'],
                         ['/safaris/serengeti','combination page'],
                         ['/request-quote','quote funnel'],
                         ['/','homepage']]) {
  const html = await (await fetch(base+p)).text();
  check(`no ads on the ${label}`, !html.includes('adsbygoogle'));
}

console.log(`\n${'='.repeat(46)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(46)}\n`);
process.exitCode = fail?1:0;
