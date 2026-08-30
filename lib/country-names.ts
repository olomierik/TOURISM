import type { Locale } from '@/i18n/routing';

/**
 * Country names in the reader's language.
 *
 * The `countries` table stores one English name per row, so a German visitor
 * filtering the directory was offered "Kenya" and "Tanzania" next to a nav
 * reading "Reisezeit" and "Verzeichnis" — the same half-translated impression
 * as an untranslated destination name, and on the control people use most.
 *
 * No translation table needed: Intl has had these in every locale we serve
 * since before this project existed, and a column we maintain by hand would
 * only be a way to get them wrong later.
 */
const cache = new Map<Locale, Intl.DisplayNames>();

function formatter(locale: Locale): Intl.DisplayNames {
  let f = cache.get(locale);
  if (!f) {
    f = new Intl.DisplayNames([locale], { type: 'region' });
    cache.set(locale, f);
  }
  return f;
}

/**
 * Falls back to whatever the database holds, then to the code itself.
 *
 * `of()` throws on a malformed code rather than returning undefined, and a
 * directory filter is not worth a 500 — a visitor seeing "TZ" has lost a word,
 * not the page.
 */
export function countryName(
  code: string | null | undefined,
  locale: Locale,
  fallback?: string | null,
): string {
  if (!code) return fallback ?? '';
  try {
    return formatter(locale).of(code.toUpperCase()) ?? fallback ?? code;
  } catch {
    return fallback ?? code;
  }
}
