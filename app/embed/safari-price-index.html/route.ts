import { getPriceIndex, indexVisible } from '@/lib/price-index';
import { absoluteUrl } from '@/lib/seo';

/**
 * The embeddable chart (SEO brief T11): one self-contained HTML page, no
 * scripts, light and dark, with the attribution link that is the point of
 * offering it. A 404 while the index is a draft.
 */
export const revalidate = 86400;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET() {
  if (!indexVisible) return new Response('Not found', { status: 404 });
  const { rows, asOf } = await getPriceIndex();
  const shown = rows.filter((r) => r.estimate.midrange);
  const max = Math.max(...shown.map((r) => r.estimate.midrange![1]), 1);
  const page = absoluteUrl('/safari-price-index');

  const bars = shown
    .map((r) => {
      const [lo, hi] = r.estimate.midrange!;
      return `<li><span class="n">${esc(r.park)}</span><span class="t"><span class="b" style="left:${((lo / max) * 100).toFixed(1)}%;width:${(((hi - lo) / max) * 100).toFixed(1)}%"></span><span class="v">$${lo}–$${hi}</span></span></li>`;
    })
    .join('');

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Tanzania Safari Price Index</title>
<style>
:root{--bg:#fff;--fg:#1f2421;--muted:#5d6661;--track:#eef1ec;--bar:#2f6f4e}
@media (prefers-color-scheme:dark){:root{--bg:#141815;--fg:#e8ece9;--muted:#a3ada7;--track:#232a25;--bar:#6fbf93}}
*{box-sizing:border-box}body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}
h1{font-size:16px;margin:0 0 4px}p{margin:0 0 12px;color:var(--muted);font-size:12px}
ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}li{display:grid;grid-template-columns:minmax(7rem,11rem) 1fr;gap:8px;align-items:center}
.n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.t{position:relative;height:22px;background:var(--track);border-radius:4px}
.b{position:absolute;top:0;bottom:0;background:var(--bar);opacity:.35;border-radius:4px}.v{position:absolute;right:6px;top:0;bottom:0;display:flex;align-items:center;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
a{color:var(--bar)}
</style></head><body>
<h1>Mid-range safari cost per person per day, Tanzania</h1>
<p>USD, park fees included. Updated ${asOf}.</p>
<ul>${bars}</ul>
<p style="margin-top:12px">Source: <a href="${page}" target="_blank" rel="noopener">Tanzania Safari Price Index, ExploreTanzania.online</a></p>
</body></html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Meant to be framed by other sites.
      'Content-Security-Policy': 'frame-ancestors *',
    },
  });
}
