import type { MetadataRoute } from 'next';

import { getPathname } from '@/i18n/navigation';
import { locales, defaultLocale, localeMeta, type Locale } from '@/i18n/routing';
import { absoluteUrl, allowIndexing, STATIC_PAGES_REVISED } from '@/lib/seo';
import {
  getBusinessEntries,
  getCategoryEntries,
  getComboEntries,
  getDestinationEntries,
  getContentFreshness,
  getGuideEntries,
  getPackageEntries,
  type LocalizedEntry,
} from '@/lib/queries/sitemap';
import { slugForMonth } from '@/lib/months';

/**
 * Sitemap, split by content type.
 *
 * Each section is emitted at /sitemap/{id}.xml. Next does NOT create an index
 * at /sitemap.xml for named sections, so robots.txt lists every section
 * individually instead.
 *
 * Splitting is not about the 50,000-URL limit — we are far below it — but about
 * diagnosis: Search Console reports indexing per sitemap, so "the combination
 * pages are not being indexed" becomes a question you can actually answer when
 * they live in their own file.
 *
 * Every entry carries hreflang alternates covering only the locales that
 * genuinely have a translation. Advertising a URL that 404s makes Google
 * discard the whole cluster, so a single missing translation would cost a page
 * its links in the other locales too.
 */

const SECTIONS = [
  'static',
  'destinations',
  'categories',
  'combinations',
  'businesses',
  'packages',
  'guides',
  'when-to-go',
] as const;

type Section = (typeof SECTIONS)[number];

export async function generateSitemaps() {
  return SECTIONS.map((id) => ({ id }));
}

/** Builds one entry with its alternate-language cluster. */
function entryFor(
  build: (locale: Locale) => string | null,
  lastModified: Date,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  image?: string | null,
): MetadataRoute.Sitemap[number] | null {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    const path = build(locale);
    if (path) languages[localeMeta[locale].hrefLang] = absoluteUrl(path);
  }

  // English anchors the cluster where it exists. Where it does not, the first
  // locale that does anchors it instead.
  //
  // This used to return null outright, on the reasoning that a guide translated
  // only into German was a rare accident. It is now a deliberate content
  // strategy: a guide answering "which vaccinations do I need as a German
  // traveller" has no English audience and should not be written one. Dropping
  // those pages from the sitemap would have hidden the entire German-market
  // experiment from Google while looking like nothing was wrong.
  const canonical =
    build(defaultLocale) ?? locales.map((l) => build(l)).find(Boolean) ?? null;
  if (!canonical) return null;

  return {
    url: absoluteUrl(canonical),
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
    ...(image ? { images: [image] } : {}),
  };
}

/**
 * Public routes that exist independently of any database row.
 *
 * Every one of these carried `new Date()`. The sitemap regenerates on each
 * revalidation, so /privacy — unchanged since launch — reported a brand new
 * lastmod on every single crawl. Google's stated policy is to disregard lastmod
 * from a site that reports it inaccurately, which meant these nine URLs were
 * undermining the signal on the four hundred that compute it honestly.
 *
 * An index page is not static: /directory changes precisely when a business
 * changes, so it takes the newest business timestamp. The four hand-written
 * pages take a constant that a human bumps when the copy is edited.
 */
function staticEntries(fresh: {
  destinations: Date;
  businesses: Date;
  guides: Date;
  newest: Date;
}): MetadataRoute.Sitemap {
  const routes = [
    { href: '/' as const, priority: 1.0, freq: 'daily' as const, at: fresh.newest },
    { href: '/destinations' as const, priority: 0.9, freq: 'weekly' as const, at: fresh.destinations },
    { href: '/directory' as const, priority: 0.9, freq: 'daily' as const, at: fresh.businesses },
    { href: '/guides' as const, priority: 0.8, freq: 'weekly' as const, at: fresh.guides },
    { href: '/when-to-go' as const, priority: 0.8, freq: 'monthly' as const, at: fresh.destinations },
    { href: '/request-quote' as const, priority: 0.8, freq: 'monthly' as const, at: STATIC_PAGES_REVISED },
    { href: '/about' as const, priority: 0.4, freq: 'yearly' as const, at: STATIC_PAGES_REVISED },
    { href: '/contact' as const, priority: 0.4, freq: 'yearly' as const, at: STATIC_PAGES_REVISED },
    { href: '/privacy' as const, priority: 0.2, freq: 'yearly' as const, at: STATIC_PAGES_REVISED },
    { href: '/terms' as const, priority: 0.2, freq: 'yearly' as const, at: STATIC_PAGES_REVISED },
  ];

  return routes.flatMap((r) => {
    const entry = entryFor(
      (locale) => getPathname({ href: r.href, locale }),
      r.at,
      r.priority,
      r.freq,
    );
    return entry ? [entry] : [];
  });
}

function fromLocalized(
  entries: LocalizedEntry[],
  build: (locale: Locale, slug: string) => string,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
): MetadataRoute.Sitemap {
  return entries.flatMap((e) => {
    const entry = entryFor(
      (locale) => {
        const slug = e.slugs[locale];
        return slug ? build(locale, slug) : null;
      },
      e.lastModified,
      priority,
      changeFrequency,
      e.image,
    );
    return entry ? [entry] : [];
  });
}

/**
 * Next 16 passes `id` as a Promise, in line with the async params it introduced
 * for pages and layouts. Destructuring it synchronously yields a pending Promise
 * rather than the section name, every `switch` arm misses, and each sitemap is
 * emitted empty with no error anywhere — the failure is completely silent.
 */
export default async function sitemap({
  id,
}: {
  id: Promise<Section> | Section;
}): Promise<MetadataRoute.Sitemap> {
  const section = await id;

  // With indexing disabled the site should not be advertising URLs at all —
  // robots.txt already disallows everything, and an empty sitemap keeps the two
  // consistent rather than contradicting each other.
  if (!allowIndexing) return [];

  switch (section) {
    case 'static':
      return staticEntries(await getContentFreshness());

    case 'destinations':
      return fromLocalized(
        await getDestinationEntries(),
        (locale, slug) =>
          getPathname({ href: { pathname: '/destinations/[slug]', params: { slug } }, locale }),
        0.9,
        'weekly',
      );

    case 'categories': {
      // Category landing pages live at the root: /safaris, /hotels.
      const entries = await getCategoryEntries();
      return entries.flatMap((e) => {
        const entry = entryFor(
          (locale) => {
            const slug = e.slugs[locale];
            return slug ? `${locale === defaultLocale ? '' : `/${locale}`}/${slug}` : null;
          },
          e.lastModified,
          0.85,
          'weekly',
          e.image,
        );
        return entry ? [entry] : [];
      });
    }

    case 'combinations': {
      const combos = await getComboEntries();
      return combos.flatMap((c) => {
        const entry = entryFor(
          (locale) => {
            const pair = c.slugs[locale];
            return pair
              ? `${locale === defaultLocale ? '' : `/${locale}`}/${pair.category}/${pair.destination}`
              : null;
          },
          // Derived from the pair's category, destination and the operators
          // listed on it. Was `new Date()`, and combinations are the largest
          // block in the file — enough on its own to make the whole sitemap's
          // lastmod look like noise.
          c.lastModified,
          // The commercial pages. Highest priority after the homepage because
          // they target the queries that actually convert.
          0.9,
          'daily',
        );
        return entry ? [entry] : [];
      });
    }

    case 'businesses':
      return fromLocalized(
        await getBusinessEntries(),
        (locale, slug) =>
          getPathname({ href: { pathname: '/business/[slug]', params: { slug } }, locale }),
        0.8,
        'weekly',
      );

    case 'packages':
      return fromLocalized(
        await getPackageEntries(),
        (locale, slug) =>
          getPathname({ href: { pathname: '/packages/[slug]', params: { slug } }, locale }),
        0.7,
        'weekly',
      );

    case 'when-to-go': {
      // Twelve months, each with a slug per locale. Built in code rather than
      // from the database because the months are in code — but the lastmod
      // still tracks the seasonality data, since that is what the pages render.
      const at = (await getContentFreshness()).destinations;
      return Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
        const languages = Object.fromEntries(
          // Keyed by hrefLang, matching entryFor above. Using the bare locale
          // here would emit a different key shape from every other section and
          // split the cluster Google is meant to read as one page.
          locales.map((locale) => [
            localeMeta[locale].hrefLang,
            absoluteUrl(
              getPathname({
                href: { pathname: '/when-to-go/[month]', params: { month: slugForMonth(month, locale) } },
                locale,
              }),
            ),
          ]),
        );

        return {
          url: absoluteUrl(
            getPathname({
              href: { pathname: '/when-to-go/[month]', params: { month: slugForMonth(month, 'en') } },
              locale: 'en',
            }),
          ),
          lastModified: at,
          changeFrequency: 'monthly' as const,
          priority: 0.8,
          alternates: { languages },
        };
      });
    }

    case 'guides':
      return fromLocalized(
        await getGuideEntries(),
        (locale, slug) =>
          getPathname({ href: { pathname: '/guides/[slug]', params: { slug } }, locale }),
        0.7,
        'monthly',
      );

    default:
      return [];
  }
}
