const base='https://www.exploretanzania.online';
let pass=0, fail=0;
const check=(l,ok,d='')=>{ok?pass++:fail++;console.log(`  ${ok?'PASS':'FAIL'}  ${l}${d?` — ${d}`:''}`);};

console.log('\n--- robots.txt ---');
const rb = await (await fetch(base+'/robots.txt')).text();
check('allows crawling', rb.includes('Allow: /') && !/^Disallow: \/$/m.test(rb.trim()));
check('names answer-engine crawlers', rb.includes('OAI-SearchBot') && rb.includes('PerplexityBot'));
check('still blocks dashboard and admin', rb.includes('/dashboard/') && rb.includes('/admin/'));
console.log(rb.split('\n').slice(0,4).map(l=>'    '+l).join('\n'));

console.log('\n--- page indexability ---');
for (const [p,l] of [['/','homepage'],['/guides/tanzania-safari-cost','guide'],['/safaris/serengeti','combination']]) {
  const html = await (await fetch(base+p)).text();
  const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? '(none)';
  check(`${l}: indexable`, robots.includes('index') && !robots.includes('noindex'), robots);
}

console.log('\n--- sitemaps ---');
let total=0;
for (const s of ['static','destinations','categories','combinations','businesses','packages','guides']) {
  const r = await fetch(`${base}/sitemap/${s}.xml`);
  const n = r.ok ? [...(await r.text()).matchAll(/<loc>/g)].length : 0;
  total += n;
  console.log(`    ${s.padEnd(14)} ${String(r.status).padEnd(4)} ${n} urls`);
}
check('sitemaps are populated', total > 0, `${total} URLs total`);

console.log('\n--- llms.txt ---');
const llms = await (await fetch(base+'/llms.txt')).text();
check('serves the full site map', llms.includes('## Destinations') && !llms.includes('not yet published'));

console.log('\n--- ads ---');
const guide = await (await fetch(base+'/guides/tanzania-safari-cost')).text();
check('ads live on guide pages', guide.includes('adsbygoogle'));
check('publisher ID is correct', guide.includes('ca-pub-9645056123999913'));
for (const [p,l] of [['/business/demo-serengeti-plains-safaris','business profile'],['/request-quote','quote funnel'],['/','homepage'],['/directory','directory']]) {
  const html = await (await fetch(base+p)).text();
  check(`still no ads on ${l}`, !html.includes('adsbygoogle'));
}
const ads = await fetch(base+'/ads.txt');
check('ads.txt served', ads.status===200);

console.log(`\n${'='.repeat(46)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(46)}\n`);
