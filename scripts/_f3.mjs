const base='https://www.exploretanzania.online';
let pass=0, fail=0;
const check=(l,ok,d='')=>{ok?pass++:fail++;console.log(`  ${ok?'PASS':'FAIL'}  ${l}${d?` — ${d}`:''}`);};

const llms = await (await fetch(base+'/llms.txt')).text();
check('llms.txt serves the full map', llms.includes('## Destinations') && !llms.includes('not yet published'));

const guide = await (await fetch(base+'/guides/tanzania-safari-cost')).text();
check('ads live on guide pages', guide.includes('adsbygoogle'));
check('publisher ID correct', guide.includes('ca-pub-9645056123999913'));

for (const [p,l] of [['/business/demo-serengeti-plains-safaris','business profile'],
                     ['/request-quote','quote funnel'],['/','homepage'],
                     ['/directory','directory'],['/safaris/serengeti','combination']]) {
  const html = await (await fetch(base+p)).text();
  check(`no ads on ${l}`, !html.includes('adsbygoogle'));
}
const ads = await fetch(base+'/ads.txt');
check('ads.txt served', ads.status===200);
console.log(`\n  ${pass} passed, ${fail} failed\n`);
