import { pathnames } from './routing';
import { MONTH_SLUGS } from '../lib/months';

/**
 * Where a Swahili URL goes now that Swahili is retired (owner's call, 21 Nov
 * 2026: "Remove swahili from this app").
 *
 * Swahili was served until today, and Google holds about 650 of its URLs
 * (419 listings, 192 wildlife pages, the static and month pages). Each one
 * gets a 301 to the same page in English, so whatever those URLs earned
 * passes to the English page and the duplicate leaves the index.
 *
 * Swahili never had content of its own (contentLocale read English rows), so
 * its slugs for listings, destinations, guides and wildlife are the English
 * slugs. Only three things were Swahili and need translating back:
 *
 *   route words   /sw/vifurushi/x, /sw/marejesho: read from the pathnames
 *                 table in routing.ts, which keeps the Swahili segments
 *                 for exactly this purpose
 *   month slugs   /sw/wakati-wa-kwenda/januari -> /when-to-go/january
 *   categories    /sw/safari, /sw/hoteli/arusha: six category slugs, copied
 *                 from category_translations on 21 Nov 2026 (they come from
 *                 the database and the proxy must not query it per request)
 *
 * Anything else under /sw drops the prefix: with English slugs that is the
 * English page.
 */

const CATEGORY_SW_TO_EN: Record<string, string> = {
  safari: 'safaris',
  hoteli: 'hotels',
  shughuli: 'activities',
  migahawa: 'restaurants',
  waongozaji: 'tour-guides',
  'kukodi-gari': 'car-rental',
};

type Rule = { re: RegExp; params: string[]; en: string };

const RULES: Rule[] = Object.values(pathnames)
  .filter((v): v is Exclude<typeof v, string> => typeof v !== 'string')
  .map((v) => {
    const sw = (v as Record<string, string>).sw;
    const en = (v as Record<string, string>).en;
    const params: string[] = [];
    const pattern = sw
      .split('/')
      .map((seg) => {
        const catchAll = seg.match(/^\[\.\.\.(\w+)\]$/);
        if (catchAll) {
          params.push(catchAll[1]);
          return '(.+)';
        }
        const param = seg.match(/^\[(\w+)\]$/);
        if (param) {
          params.push(param[1]);
          return '([^/]+)';
        }
        return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    return { re: new RegExp(`^${pattern}$`), params, en };
  })
  // Literal routes first, so /vivutio is not taken for a [slug] pattern.
  .sort((a, b) => a.params.length - b.params.length);

/** The English path for a path that began with /sw, given without that prefix. */
export function englishPathForSwahili(rest: string): string {
  const path = rest === '' ? '/' : rest.replace(/\/$/, '') || '/';

  for (const rule of RULES) {
    const m = path.match(rule.re);
    if (!m) continue;
    let out = rule.en;
    rule.params.forEach((name, i) => {
      let value = m[i + 1];
      if (name === 'month') {
        const index = MONTH_SLUGS.sw.indexOf(value);
        if (index >= 0) value = MONTH_SLUGS.en[index];
      }
      out = out.replace(`[...${name}]`, value).replace(`[${name}]`, value);
    });
    return out;
  }

  const [first, ...more] = path.split('/').filter(Boolean);
  if (first && CATEGORY_SW_TO_EN[first]) {
    return `/${[CATEGORY_SW_TO_EN[first], ...more].join('/')}`;
  }
  return path;
}
