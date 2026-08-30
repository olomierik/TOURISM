import type { Locale } from '@/i18n/routing';

/**
 * Month slugs, one set per locale.
 *
 * "When should I go" is the highest-volume planning question in this niche and
 * the site could not answer it as a browse: 552 rows of month-by-month
 * conditions existed, reachable only by a reader who already knew which
 * destination they wanted — which is the question they came to ask.
 *
 * Slugs are localized like every other public URL here. /de/reisezeit/maerz is
 * the German phrasing of the query it answers, and an English slug under a
 * German prefix would rank for nothing. `maerz` rather than `märz` because a
 * percent-encoded umlaut in a URL is ugly in a SERP and fragile when pasted.
 *
 * Hard-coded rather than stored: there will be twelve months for the lifetime of
 * this codebase, and a table would add a join to every page for data that cannot
 * change.
 */
export const MONTH_SLUGS: Record<Locale, readonly string[]> = {
  en: [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ],
  de: [
    'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'dezember',
  ],
  fr: [
    'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
  ],
  it: [
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
  ],
} as const;

/** 1-12, or null when the slug is not a month in this locale. */
export function monthFromSlug(slug: string, locale: Locale): number | null {
  const i = MONTH_SLUGS[locale].indexOf(slug.toLowerCase());
  return i === -1 ? null : i + 1;
}

/** The slug for a month in a locale. Months are 1-12. */
export function slugForMonth(month: number, locale: Locale): string {
  return MONTH_SLUGS[locale][month - 1];
}

/** The month before and after, for the previous/next links at the foot. */
export function adjacentMonths(month: number): { prev: number; next: number } {
  return {
    prev: month === 1 ? 12 : month - 1,
    next: month === 12 ? 1 : month + 1,
  };
}

/**
 * The month's name in the reader's language, from the platform rather than a
 * translation table — Intl already knows these in every locale we serve.
 */
export function monthName(month: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(
    new Date(Date.UTC(2026, month - 1, 1)),
  );
}

/**
 * What a month's highlight key actually says about that month.
 *
 * The keys were written as editorial labels, not as a ranking signal, and
 * treating "has a highlight" as one binary produced a bad "best in July": the
 * Serengeti and Mara river crossings — the most recognised wildlife event on the
 * continent — fell behind three parks that are equally good in July and merely
 * quieter. Iconic places are busy in their own month, so crowds cannot be the
 * thing that decides the top of the list.
 *
 * Three tiers, because the keys genuinely describe three different things:
 *
 *   event    something happens in this month and not the others — the reason to
 *            pick this month over any other
 *   quality  a good thing that is true here all year; worth saying, not a reason
 *            to come now
 *   adverse  conditions to plan around, which must sort down rather than up
 *
 * Anything unlisted counts as a quality, so a new key added to the seed data
 * ranks sensibly by default instead of vanishing.
 */
const SEASONAL_EVENTS = new Set([
  'calving', 'river_crossing', 'rut', 'whale_shark', 'flamingo', 'turtles',
  'climbing', 'kwita_izina', 'festival', 'reverse_season', 'kilimanjaro_view',
]);

const ADVERSE = new Set(['long_rains', 'short_rains', 'wet', 'closed', 'avoid', 'heat', 'busy']);

/** Higher sorts first: 2 event, 1 quality, 0 nothing said, -1 plan around it. */
export function highlightRank(key: string | null): number {
  if (!key) return 0;
  if (SEASONAL_EVENTS.has(key)) return 2;
  if (ADVERSE.has(key)) return -1;
  return 1;
}
