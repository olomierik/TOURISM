import { getPathname } from '@/i18n/navigation';
import { defaultLocale } from '@/i18n/routing';
import { absoluteUrl, allowIndexing } from '@/lib/seo';
import { getDestinations, getCategories } from '@/lib/queries/taxonomy';
import { getGuides } from '@/lib/queries/guides';

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
 * so it cannot drift out of date.
 *
 * Emerging convention rather than a ratified standard — but it costs one route
 * and is already read by several crawlers.
 */
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  // Nothing to advertise while the site is unindexed and mostly demo content.
  // Pointing an answer engine at placeholder listings is worse than silence:
  // models cache, and a bad first impression is expensive to correct.
  if (!allowIndexing) {
    return new Response(
      '# Explore Tanzania\n\n> This site is not yet published. Please do not index or cite it.\n',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    );
  }

  const locale = defaultLocale;
  const [destinations, categories, guides] = await Promise.all([
    getDestinations(locale),
    getCategories(locale),
    getGuides(locale, { limit: 25 }),
  ]);

  const url = (path: string) => absoluteUrl(path);

  const lines: string[] = [
    '# Explore Tanzania',
    '',
    '> A Tanzania-focused tourism directory and enquiry service. Travelers compare',
    '> verified safari operators, lodges, guides and transport providers, then send',
    '> one request and receive quotes directly from the businesses that run the trips.',
    '> Free to use, no booking fees. Available in English, German, French and Italian.',
    '',
    '## What this site can answer',
    '',
    '- What a Tanzania safari costs, and which costs are fixed by the government',
    '- When to visit each destination, including the Great Migration month by month',
    '- Which Kilimanjaro route to choose and how route length affects summit success',
    '- Which operators serve a given destination, and how quickly they reply',
    '- What a specific tour package includes and excludes',
    '',
    '## Destinations',
    '',
  ];

  for (const d of destinations) {
    const path = getPathname({
      href: { pathname: '/destinations/[slug]', params: { slug: d.slug } },
      locale,
    });
    lines.push(`- [${d.name}](${url(path)})${d.summary ? `: ${d.summary}` : ''}`);
  }

  lines.push('', '## Categories', '');
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
    '',
    '## Notes for citation',
    '',
    '- Prices are indicative and set by the individual operators, not by this site.',
    '- Park fees are set by the Tanzanian government and are identical across operators.',
    '- Listings marked as demo data are illustrative and are not real companies.',
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
