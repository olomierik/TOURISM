import type { MetadataRoute } from 'next';

import { getPathname } from '@/i18n/navigation';
import { locales, defaultLocale, localeMeta, type Locale } from '@/i18n/routing';
import { absoluteUrl, allowIndexing } from '@/lib/seo';
import {
  getBusinessEntries,
  getCategoryEntries,
  getComboEntries,
  getDestinationEntries,
  getGuideEntries,
  getPackageEntries,
  type LocalizedEntry,
} from '@/lib/queries/sitemap';

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
): MetadataRoute.Sitemap[number] | null {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    const path = build(locale);
    if (path) languages[localeMeta[locale].hrefLang] = absoluteUrl(path);
  }

  const canonical = build(defaultLocale);
  // No English version means no canonical to anchor the cluster on. Rare, but a
  // guide translated only into German would otherwise emit a broken entry.
  if (!canonical) return null;

  return {
    url: absoluteUrl(canonical),
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
  };
}

/** Public routes that exist independently of any database row. */
function staticEntries(): MetadataRoute.Sitemap {
  const routes = [
    { href: '/' as const, priority: 1.0, freq: 'daily' as const },
    { href: '/destinations' as const, priority: 0.9, freq: 'weekly' as const },
    { href: '/directory' as const, priority: 0.9, freq: 'daily' as const },
    { href: '/guides' as const, priority: 0.8, freq: 'weekly' as const },
    { href: '/request-quote' as const, priority: 0.8, freq: 'monthly' as const },
    { href: '/about' as const, priority: 0.4, freq: 'yearly' as const },
    { href: '/contact' as const, priority: 0.4, freq: 'yearly' as const },
    { href: '/privacy' as const, priority: 0.2, freq: 'yearly' as const },
    { href: '/terms' as const, priority: 0.2, freq: 'yearly' as const },
  ];

  return routes.flatMap((r) => {
    const entry = entryFor(
      (locale) => getPathname({ href: r.href, locale }),
      new Date(),
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
      return staticEntries();

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
          new Date(),
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
