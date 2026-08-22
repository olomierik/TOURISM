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

// getPathname accepts either a plain route or a route + params for dynamic segments.
type Href = Parameters<typeof getPathname>[0]['href'];

/**
 * Builds the canonical + hreflang cluster for a page.
 *
 * Every localized variant must point at every other variant *and* at itself,
 * otherwise Google discards the cluster and the four locales compete as duplicate
 * content instead of reinforcing each other. x-default points at English.
 */
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
