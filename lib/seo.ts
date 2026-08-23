import { getPathname } from '@/i18n/navigation';
import { locales, defaultLocale, localeMeta, type Locale } from '@/i18n/routing';

/**
 * Canonical origin. Vercel injects VERCEL_PROJECT_PRODUCTION_URL on deploys; the
 * explicit env var wins so a custom domain can be set without a code change.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
).replace(/\/$/, '');

export function absoluteUrl(path: string) {
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Master switch for search-engine indexing. Defaults to OFF.
 *
 * Organic search is this product's entire growth channel, which makes the first
 * crawl expensive to get wrong: a site indexed while most routes still say
 * "this section is being built" teaches Google it is thin, and that assessment
 * outlives the placeholder content by months.
 *
 * Flip NEXT_PUBLIC_ALLOW_INDEXING to "true" only once real listings and guides
 * are live on the canonical domain.
 */
export const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';

/** Metadata `robots` block reflecting the indexing switch. */
export const robotsPolicy = allowIndexing
  ? {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' as const },
    }
  : { index: false, follow: false, nocache: true };

// getPathname accepts either a plain route or a route + params for dynamic segments.
type Href = Parameters<typeof getPathname>[0]['href'];

/**
 * Builds the canonical + hreflang cluster for a page.
 *
 * Every localized variant must point at every other variant *and* at itself,
 * otherwise Google discards the cluster and the four locales compete as duplicate
 * content instead of reinforcing each other. x-default points at English.
 */
/**
 * Alternates for a page whose slug differs per locale.
 *
 * `localeAlternates` below reuses ONE slug across every locale, which is correct
 * for businesses and packages (a trading name is a proper noun) but wrong for
 * anything translated. On /destinations/zanzibar it emitted
 * /de/reiseziele/zanzibar — a 404, because the German page is
 * /de/reiseziele/sansibar. Google discards a whole hreflang cluster when its
 * URLs do not resolve, so that one mistake cost the page its links in all three
 * other locales.
 *
 * `slugs` must contain only locales that genuinely have a translation. A locale
 * that is absent is simply not advertised, which is the honest signal.
 */
/** Routes whose slug is translated, and therefore differs per locale. */
type SlugRoute = '/destinations/[slug]' | '/guides/[slug]';

export function localeAlternatesFromSlugs(
  pathname: SlugRoute,
  slugs: Partial<Record<Locale, string>>,
  currentLocale: Locale,
) {
  const url = (locale: Locale, slug: string) =>
    absoluteUrl(getPathname({ href: { pathname, params: { slug } }, locale }));

  const languages: Record<string, string> = {};

  for (const locale of locales) {
    const slug = slugs[locale];
    if (slug) languages[localeMeta[locale].hrefLang] = url(locale, slug);
  }

  const defaultSlug = slugs[defaultLocale];
  if (defaultSlug) languages['x-default'] = url(defaultLocale, defaultSlug);

  const currentSlug = slugs[currentLocale];

  return {
    canonical: currentSlug ? url(currentLocale, currentSlug) : undefined,
    languages,
  };
}

export function localeAlternates(href: Href, currentLocale: string) {
  const languages: Record<string, string> = {};

  for (const locale of locales) {
    languages[localeMeta[locale].hrefLang] = absoluteUrl(
      getPathname({ href, locale }),
    );
  }

  languages['x-default'] = absoluteUrl(
    getPathname({ href, locale: defaultLocale }),
  );

  return {
    canonical: absoluteUrl(
      getPathname({ href, locale: currentLocale as Locale }),
    ),
    languages,
  };
}

/**
 * Alternates for a category x destination combination page.
 *
 * Both halves of the URL are translated, so this takes the resolved pair per
 * locale rather than reusing one pair everywhere. Combination routes are not in
 * the next-intl pathnames config — they are generated from data — so the paths
 * are composed directly, applying the same as-needed locale prefix.
 */
export function localeAlternatesForCombo(
  slugs: Partial<Record<Locale, { category: string; destination: string }>>,
  currentLocale: Locale,
) {
  const url = (locale: Locale, pair: { category: string; destination: string }) =>
    absoluteUrl(
      `${locale === defaultLocale ? '' : `/${locale}`}/${pair.category}/${pair.destination}`,
    );

  const languages: Record<string, string> = {};
  for (const locale of locales) {
    const pair = slugs[locale];
    if (pair) languages[localeMeta[locale].hrefLang] = url(locale, pair);
  }

  const fallback = slugs[defaultLocale];
  if (fallback) languages['x-default'] = url(defaultLocale, fallback);

  const current = slugs[currentLocale];

  return {
    canonical: current ? url(currentLocale, current) : undefined,
    languages,
  };
}

/**
 * Alternates for a single-segment route generated from data, such as the
 * category landing pages at /safaris and /de/safaris.
 *
 * These are not in the next-intl pathnames config — they come from the database
 * — so the path is composed directly with the same as-needed locale prefix.
 */
export function localeAlternatesForSegment(
  slugs: Partial<Record<Locale, string>>,
  currentLocale: Locale,
) {
  const url = (locale: Locale, slug: string) =>
    absoluteUrl(`${locale === defaultLocale ? '' : `/${locale}`}/${slug}`);

  const languages: Record<string, string> = {};
  for (const locale of locales) {
    const slug = slugs[locale];
    if (slug) languages[localeMeta[locale].hrefLang] = url(locale, slug);
  }

  const fallback = slugs[defaultLocale];
  if (fallback) languages['x-default'] = url(defaultLocale, fallback);

  const current = slugs[currentLocale];
  return {
    canonical: current ? url(currentLocale, current) : undefined,
    languages,
  };
}
