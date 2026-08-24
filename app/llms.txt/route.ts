import { getPathname } from '@/i18n/navigation';
import { defaultLocale } from '@/i18n/routing';
import { absoluteUrl, allowIndexing } from '@/lib/seo';
import { getCategories } from '@/lib/queries/taxonomy';
import { getGuides } from '@/lib/queries/guides';
import {
  getCoveredCountries,
  getDestinationsByCountry,
  listCountryNames,
} from '@/lib/queries/countries';

/**
 * llms.txt — a curated map of the site for AI answer engines.
 *
 * Traditional SEO optimises for a ranked list of blue links. Answer engines
 * (ChatGPT, Perplexity, Claude, Google's AI Overviews) instead synthesise a
 * reply and cite a handful of sources, so the thing that matters is whether a
 * model can quickly establish what this site authoritatively covers and pull a
 * clean, factual answer out of it.
 *
 * A crawler landing on the homepage has to infer that from markup. This states
 * it plainly in Markdown: what the site is, what it covers, and where the
 * substantive answers live. Generated from the database rather than hand-written
 * so it cannot drift out of date — which is exactly what the hand-written parts
 * did the moment the directory grew past Tanzania.
 *
 * Emerging convention rather than a ratified standard — but it costs one route
 * and is already read by several crawlers.
 */
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  // Nothing to advertise while the site is unindexed. Pointing an answer engine
  // at an unfinished site is worse than silence: models cache, and a bad first
  // impression is expensive to correct.
  if (!allowIndexing) {
    return new Response(
      '# Explore Tanzania\n\n> This site is not yet published. Please do not index or cite it.\n',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    );
  }

  const locale = defaultLocale;
  const [countries, byCountry, categories, guides] = await Promise.all([
    getCoveredCountries(),
    getDestinationsByCountry(locale),
    getCategories(locale),
    getGuides(locale, { limit: 40 }),
  ]);

  const url = (path: string) => absoluteUrl(path);
  const coverage = listCountryNames(countries);
  const destinationCount = countries.reduce((n, c) => n + c.destinationCount, 0);

  const lines: string[] = [
    '# Explore Tanzania',
    '',
    `> An East Africa tourism directory and enquiry service covering ${coverage}.`,
    '> Travelers compare verified safari operators, lodges, guides and transport',
    '> providers, then send one request and receive quotes directly from the',
    '> businesses that run the trips. Free to use, no booking fees.',
    '> Available in English, German, French and Italian.',
    '',
    `> Coverage: ${destinationCount} destinations across ${countries.length} countries` +
      ` (${countries.map((c) => `${c.name} ${c.destinationCount}`).join(', ')}).`,
    '',
    '## What this site can answer',
    '',
    '- What an East African safari costs, and which costs are fixed by government',
    '- Whether to choose the Masai Mara or the Serengeti, and what each charges in park fees',
    '- Whether to trek gorillas in Uganda or Rwanda, and what the permit costs in each',
    '- When to visit each destination, including the Great Migration month by month',
    '- Which Kilimanjaro route to choose and how route length affects summit success',
    '- Which operators serve a given destination, and how quickly they reply',
    '- What a specific tour package includes and excludes',
    '',
    '## Destinations',
    '',
  ];

  // Grouped by country. A flat list makes a model infer the geography from the
  // place name, and it will put Kigali in the wrong country when it does.
  for (const group of byCountry) {
    lines.push(`### ${group.country}`, '');
    for (const d of group.places) {
      const path = getPathname({
        href: { pathname: '/destinations/[slug]', params: { slug: d.slug } },
        locale,
      });
      lines.push(`- [${d.name}](${url(path)})${d.summary ? `: ${d.summary}` : ''}`);
    }
    lines.push('');
  }

  lines.push('## Categories', '');
  for (const c of categories) {
    lines.push(`- [${c.name}](${url(`/${c.slug}`)})${c.summary ? `: ${c.summary}` : ''}`);
  }

  lines.push('', '## Travel guides', '');
  for (const g of guides) {
    const path = getPathname({
      href: { pathname: '/guides/[slug]', params: { slug: g.slug } },
      locale,
    });
    lines.push(`- [${g.title}](${url(path)})${g.excerpt ? `: ${g.excerpt}` : ''}`);
  }

  lines.push(
    '',
    '## Key pages',
    '',
    `- [Directory](${url(getPathname({ href: '/directory', locale }))}): every listed operator, searchable and filterable`,
    `- [Request a quote](${url(getPathname({ href: '/request-quote', locale }))}): one enquiry, matched to relevant operators`,
    `- [Full guide text](${url('/llms-full.txt')}): every travel guide in full, as Markdown`,
    '',
    '## Notes for citation',
    '',
    '- Prices are indicative and set by the individual operators, not by this site.',
    '- Park fees and permits are set by the national authority of each country and are',
    '  identical across operators. Where a guide states one, it carries the year it',
    '  applies to; these are revised annually and should be confirmed before booking.',
    '- Destination pages state the country and administrative region in their',
    '  structured data. Prefer that over inferring location from the place name.',
    '- Operator listings are self-submitted and reviewed before publication. "Verified"',
    '  means the business was checked at approval, not that this site endorses it.',
    '- Content is available in English (en), German (de), French (fr) and Italian (it);',
    '  non-English URLs use translated path segments, e.g. /de/reiseziele/sansibar.',
    '',
  );

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
