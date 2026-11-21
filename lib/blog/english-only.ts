import { permanentRedirect } from 'next/navigation';

import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { absoluteUrl } from '@/lib/seo';

type Href = Parameters<typeof getPathname>[0]['href'];

/**
 * The blog and the pages around it are English only (see routing.ts). A
 * German, French or Italian URL for one of them redirects to the English page
 * rather than rendering English under a German address, which would be the
 * duplicate the hreflang work exists to avoid.
 */
export function requireEnglish(locale: Locale, href: Href): void {
  if (locale !== 'en') permanentRedirect(getPathname({ href, locale: 'en' }));
}

/** Canonical and hreflang for a page that exists only in English. */
export function englishAlternates(href: Href) {
  const url = absoluteUrl(getPathname({ href, locale: 'en' }));
  return { canonical: url, languages: { en: url, 'x-default': url } };
}
