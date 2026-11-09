import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

import en from '../messages/en.json';

type Catalogue = { [key: string]: string | Catalogue };

/**
 * English under everything.
 *
 * `messages/en.json` is the source of truth for the key shape (see
 * global.d.ts), and a key missing from another catalogue used to render as its
 * own path — a traveller reading the Arabic site would see
 * `dashboard.trial.cta` where a button label belongs. That is worse than
 * English, and it is worse in the one place it is most likely to happen: a new
 * locale, or a key added in English and not yet translated.
 *
 * So every locale is merged over English rather than replacing it. An
 * untranslated string falls back to the English one, per string, and the gap
 * shows up as English text rather than as a key.
 *
 * This is also what makes the four locales added in November 2026 shippable at
 * all. Chinese, Arabic, Russian and Hindi exist for inbound travellers, and
 * the two signed-in consoles — `admin` (the owner's own) and `dashboard` (a
 * Tanzanian operator's) — are not what those readers came for. Those
 * namespaces are deliberately not translated into them, and resolve to English
 * through this merge. Translating 800 strings of admin console into Hindi
 * would be work nobody would ever read.
 */
function mergeOverEnglish(locale: Catalogue, fallback: Catalogue): Catalogue {
  const out: Catalogue = { ...fallback };

  for (const [key, value] of Object.entries(locale)) {
    const base = fallback[key];
    out[key] =
      typeof value === 'object' && value !== null && typeof base === 'object' && base !== null
        ? mergeOverEnglish(value, base)
        : value;
  }

  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const own = (await import(`../messages/${locale}.json`)).default as Catalogue;
  const messages =
    locale === routing.defaultLocale ? own : mergeOverEnglish(own, en as unknown as Catalogue);

  return {
    locale,
    messages,
    // Travel content is priced and dated for an international audience; pin the
    // formats so a German visitor sees 1.234,56 € and 24.12.2026 without per-call config.
    formats: {
      dateTime: {
        short: { day: '2-digit', month: '2-digit', year: 'numeric' },
        long: { day: 'numeric', month: 'long', year: 'numeric' },
      },
      number: {
        currency: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 },
      },
    },
  };
});
