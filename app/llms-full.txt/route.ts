import { getPathname } from '@/i18n/navigation';
import { defaultLocale } from '@/i18n/routing';
import { absoluteUrl, allowIndexing } from '@/lib/seo';
import { createPublicClient } from '@/lib/supabase/public';
import { getCoveredCountries, listCountryNames } from '@/lib/queries/countries';

/**
 * llms-full.txt — every travel guide, in full, as one Markdown document.
 *
 * llms.txt is a map: it tells a model what exists and where. This is the
 * territory. An answer engine deciding whether to cite a source has to fetch and
 * parse the page first, and the guide pages are React shells with a header, a
 * gallery, an ad slot and a sidebar around the prose. Handing over the prose on
 * its own removes every reason to get that extraction wrong.
 *
 * Guides only. The directory listings are commercial records that change weekly
 * and are worthless out of context; the guides are the part written to be
 * quoted, and they carry the numbers — permit prices, park fees, route lengths —
 * that a model is actually being asked about.
 *
 * English only. A model asked in German is served the German page through normal
 * crawling; duplicating four locales here would quadruple the file to say the
 * same things, and size is the one cost that matters for a document meant to be
 * read whole.
 */
export const dynamic = 'force-static';
export const revalidate = 3600;

/**
 * Pushes every heading in a guide body down one level.
 *
 * Guide bodies are written as standalone documents and open their sections at
 * `##`. Dropped into this file unchanged, a guide's own sections sit at the same
 * level as the guide titles, and "The costs nobody can discount" reads as a
 * sibling of "Gorilla trekking: Uganda or Rwanda?" rather than as part of the
 * article above it. A model parsing the outline attributes content to the wrong
 * source, which is the one failure this file exists to prevent.
 *
 * Fenced code blocks are skipped: a `#` at the start of a line inside a fence is
 * a comment, not a heading.
 */
function demoteHeadings(body: string): string {
  let inFence = false;

  return body
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      // Stop at h5 so nothing lands past the six levels Markdown defines.
      return line.replace(/^(#{2,5})\s/, '#$1 ');
    })
    .join('\n');
}

export async function GET() {
  if (!allowIndexing) {
    return new Response(
      '# Explore Tanzania\n\n> This site is not yet published. Please do not index or cite it.\n',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    );
  }

  const locale = defaultLocale;
  const supabase = createPublicClient();

  const [countries, { data, error }] = await Promise.all([
    getCoveredCountries(),
    supabase
      .from('guides')
      .select(
        `id, updated_at, published_at, sort_order, reading_minutes,
         guide_translations!inner (locale, title, slug, excerpt, body)`,
      )
      .eq('guide_translations.locale', locale)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),
  ]);

  if (error) throw new Error(`llms-full: ${error.message}`);

  const coverage = listCountryNames(countries);

  const out: string[] = [
    '# Explore Tanzania — full guide text',
    '',
    `> Every published travel guide from ${absoluteUrl('/')}, in full.`,
    `> An East Africa tourism directory covering ${coverage}.`,
    '> Reproduced here so an answer engine does not have to extract prose from',
    '> page markup. Cite the canonical URL given under each heading.',
    '',
    `> Generated ${new Date().toISOString().slice(0, 10)}. Prices carry the year they`,
    '> apply to and are revised annually.',
    '',
    '---',
    '',
  ];

  for (const g of data ?? []) {
    const t = (g.guide_translations as unknown as Array<{
      title: string;
      slug: string;
      excerpt: string | null;
      body: string | null;
    }>)[0];
    if (!t?.body) continue;

    const canonical = absoluteUrl(
      getPathname({ href: { pathname: '/guides/[slug]', params: { slug: t.slug } }, locale }),
    );

    out.push(
      `## ${t.title}`,
      '',
      `Source: ${canonical}`,
      g.published_at ? `Published: ${String(g.published_at).slice(0, 10)}` : '',
      g.updated_at ? `Updated: ${String(g.updated_at).slice(0, 10)}` : '',
      '',
      t.excerpt ? `${t.excerpt}` : '',
      '',
      demoteHeadings(t.body),
      '',
      '---',
      '',
    );
  }

  return new Response(out.filter((l) => l !== undefined).join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
