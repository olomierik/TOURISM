import { getPathname } from '@/i18n/navigation';
import { locales, defaultLocale, localeMeta, contentLocale, type Locale } from '@/i18n/routing';

/**
 * A locale's slug, or, for a locale with no content of its own yet (Swahili), the
 * slug of the language its pages read. /sw/biashara/arusha-safaris exists and
 * renders: it needs a canonical and an hreflang entry like every other page.
 */
function slugOf<T>(slugs: Partial<Record<Locale, T>>, locale: Locale): T | undefined {
  return slugs[locale] ?? slugs[contentLocale(locale)];
}

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
 * The date the hand-written pages were last revised. Bump it when you edit the
 * copy in /about, /contact, /privacy or /terms — and only then.
 *
 * These four have no database row to take a timestamp from, and the sitemap used
 * `new Date()` for them. That is not a small inaccuracy: the sitemap regenerates
 * on every revalidation, so every crawl saw a fresh lastmod on pages that had
 * not changed since launch. Google's documented response to a lastmod it finds
 * unreliable is to stop trusting the signal for the whole site — including the
 * sections where it is derived correctly from updated_at.
 *
 * A constant is honest here in a way a computed date cannot be.
 */
export const STATIC_PAGES_REVISED = new Date('2026-08-24T00:00:00Z');

/**
 * Floor for any lastmod with nothing real behind it.
 *
 * Same reasoning as above: a row with no usable timestamp should report a fixed
 * old date, not "now". Old and wrong costs a slower recrawl of one URL; fresh
 * and wrong costs the credibility of every lastmod on the site.
 */
export const CONTENT_EPOCH = new Date('2026-01-01T00:00:00Z');

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
type SlugRoute =
  | '/destinations/[slug]'
  | '/guides/[slug]'
  | '/business/[slug]'
  | '/packages/[slug]';

export function localeAlternatesFromSlugs(
  pathname: SlugRoute,
  slugs: Partial<Record<Locale, string>>,
  currentLocale: Locale,
) {
  const url = (locale: Locale, slug: string) =>
    absoluteUrl(getPathname({ href: { pathname, params: { slug } }, locale }));

  const languages: Record<string, string> = {};

  for (const locale of locales) {
    const slug = slugOf(slugs, locale);
    if (slug) languages[localeMeta[locale].hrefLang] = url(locale, slug);
  }

  const defaultSlug = slugs[defaultLocale];
  if (defaultSlug) languages['x-default'] = url(defaultLocale, defaultSlug);

  const currentSlug = slugOf(slugs, currentLocale);

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
    const pair = slugOf(slugs, locale);
    if (pair) languages[localeMeta[locale].hrefLang] = url(locale, pair);
  }

  const fallback = slugs[defaultLocale];
  if (fallback) languages['x-default'] = url(defaultLocale, fallback);

  const current = slugOf(slugs, currentLocale);

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
    const slug = slugOf(slugs, locale);
    if (slug) languages[localeMeta[locale].hrefLang] = url(locale, slug);
  }

  const fallback = slugs[defaultLocale];
  if (fallback) languages['x-default'] = url(defaultLocale, fallback);

  const current = slugOf(slugs, currentLocale);
  return {
    canonical: current ? url(currentLocale, current) : undefined,
    languages,
  };
}

/**
 * A title and description for one listing, built from what we know about it.
 *
 * Measured against the live site on 2026-11-02, and the reason this exists:
 * the 412 indexable listings shared **thirteen** distinct meta descriptions
 * between them, because the description fell back to a tagline imported from a
 * licensing register. One hundred and sixty-three pages carried the identical
 * sentence "Category E member, Kenya Association of Tour Operators"; the title
 * fell back to the bare trading name, so a Ugandan car-hire firm read
 * "4WD Africa · Explore Tanzania" and said nothing about what it was or where.
 *
 * Search Console shows what that cost. 438 URLs sit in "Discovered — currently
 * not indexed", almost all of them /business/[slug], and Google records the
 * last crawl of each as N/A: it found the URLs in the sitemap, sampled the
 * pattern, and declined to spend crawl budget on the rest. A directory whose
 * pages differ only by a name is one page as far as a crawler is concerned.
 *
 * So every field here is a fact already on the row — place, trade, standing,
 * reach — and nothing is claimed that the database does not hold. A listing we
 * know little about gets a short description rather than a padded one, because
 * inventing the difference is what got the pages dropped in the first place.
 */
export function businessSeo(input: {
  name: string;
  category?: string | null;
  city?: string | null;
  country?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  foundedYear?: number | null;
  isVerified?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
}): { title: string; description?: string } {
  const place = [input.city, input.country].filter(Boolean).join(', ');
  const trade = input.category?.trim() || null;

  // An editor's own words always win. This composes a default, not an override.
  const title =
    input.seoTitle?.trim() ||
    [input.name, trade && place ? `${trade} in ${place}` : trade || place]
      .filter(Boolean)
      .join(' — ');

  if (input.seoDescription?.trim()) {
    return { title, description: input.seoDescription.trim() };
  }

  const sentences: string[] = [];

  sentences.push(
    trade && place
      ? `${input.name} is a ${trade.toLowerCase()} based in ${place}.`
      : place
        ? `${input.name} operates in ${place}.`
        : `${input.name} is listed in the Explore Tanzania directory.`,
  );

  // A rating is the one number on these pages that is genuinely per-listing,
  // so it does more to separate two otherwise identical entries than any
  // adjective would.
  const count = input.ratingCount ?? 0;
  const avg = input.ratingAvg ?? 0;
  if (count > 0 && avg > 0) {
    sentences.push(
      `Rated ${avg.toFixed(1)} out of 5 from ${count} ${count === 1 ? 'review' : 'reviews'}.`,
    );
  }

  if (input.foundedYear) sentences.push(`Operating since ${input.foundedYear}.`);
  if (input.isVerified) sentences.push('Verified listing.');

  sentences.push('See contact details and request a quote.');

  // Google truncates around 160 characters; a sentence cut mid-word reads as
  // broken, so whole sentences are dropped from the end instead.
  let description = '';
  for (const s of sentences) {
    if (description && `${description} ${s}`.length > 160) break;
    description = description ? `${description} ${s}` : s;
  }

  return { title, description };
}
