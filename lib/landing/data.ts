import 'server-only';

import type { Locale } from '@/i18n/routing';
import { getCategories, getDestinations } from '@/lib/queries/taxonomy';
import { searchBusinesses } from '@/lib/queries/businesses';
import { searchPackages } from '@/lib/queries/packages';
import { getGuidesBySlugs } from '@/lib/queries/guides';
import type { LandingPage } from '@/lib/landing';

/**
 * The live half of a landing page: matching operators, tours and guides.
 *
 * Built from the page's filters with the same queries the directory and the
 * tour search use, so a landing page and the directory never disagree about
 * who serves the Serengeti.
 */
export async function loadLandingData(page: LandingPage, locale: Locale) {
  const f = page.filters;
  const [destinations, categories] = await Promise.all([getDestinations(locale), getCategories(locale)]);
  const destination = f.destination ? destinations.find((d) => d.key === f.destination) : undefined;
  const category = f.category ? categories.find((c) => c.key === f.category) : undefined;

  // Tours carry no country, so a country-only page (Kenya, Uganda) would show
  // Tanzanian tours. They are shown only where the page is about a place or a
  // kind of tour that the tour search can actually filter by.
  const showTours = Boolean(destination || f.tours) && (!f.country || f.country === 'TZ');

  const [operators, tours, guides] = await Promise.all([
    searchBusinesses(locale, {
      destinationId: destination?.id,
      categoryId: category?.id,
      countryCode: f.country,
      intent: f.intent,
      activity: f.activity,
      perPage: 9,
    }),
    showTours
      ? searchPackages(locale, {
          destinationId: destination?.id,
          minDays: f.tours?.minDays,
          maxDays: f.tours?.maxDays,
          comfort: f.tours?.comfort,
          style: f.tours?.style,
          perPage: 6,
        })
      : Promise.resolve({ items: [], total: 0 }),
    getGuidesBySlugs(locale, page.guides ?? []),
  ]);

  return { destination, category, operators, tours, guides };
}

/** The search-result title, with the operator count where there is one worth stating. */
export function landingTitle(page: LandingPage, operatorCount: number): string {
  if (operatorCount >= 2 && page.metaTitle.includes('{count}')) {
    return page.metaTitle.replace('{count}', operatorCount.toLocaleString('en'));
  }
  return page.metaTitleFallback;
}
