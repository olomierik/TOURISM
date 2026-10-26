import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

import { Hero } from '@/components/home/hero';
import {
  BrowseByType,
  EndBand,
  FeaturedOperators,
  HowItWorks,
  PlanWithConfidence,
  PriceBand,
  SampleQuotes,
  TrustStrip,
  WhereAndWhen,
} from '@/components/home/sections';
import { getHeroPhoto } from '@/lib/queries/hero';
import { getDestinations, getCategoriesWithCounts } from '@/lib/queries/taxonomy';

/**
 * Home — design.md §7.1.
 *
 * Nine sections, in the spec's order, against a target of 4,500px on mobile and
 * 4,200px on desktop. The page it replaces ran twelve blocks and 6,279px.
 *
 * What left, and where it went (§7.1 "Remove from the homepage"):
 *   events list            -> /events
 *   "Find what you need near you" -> Plan menu
 *   "Put your business on the map" -> footer and /for-business
 *   newsletter             -> footer
 *   "Not sure where to start?" -> merged into the hero's QuoteStarter
 *   six-category grid      -> section 4, now gated at 25 listings
 *
 * Every one of them was a reasonable block on its own. Together they made a
 * homepage that asked a visitor to read twelve propositions before doing the
 * one thing the site is for.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [photo, destinations, categories] = await Promise.all([
    getHeroPhoto(locale),
    getDestinations(locale, { limit: 48 }),
    getCategoriesWithCounts(locale),
  ]);

  // §9.3: the combobox offers Tanzania by default. The other countries stay
  // reachable from the quote flow's own scope switch.
  const options = destinations
    .filter((d) => (d.countryCode ?? 'TZ').toUpperCase() === 'TZ')
    .map((d) => ({ value: d.slug, label: d.name }));

  return (
    <main className="flex w-full flex-col">
      <Hero photo={photo} destinations={options} />
      <TrustStrip locale={locale} />
      <SampleQuotes />
      <BrowseByType locale={locale} categories={categories} />
      <WhereAndWhen locale={locale} />
      <HowItWorks />
      {/* Renders nothing until §9.2 can be met — see lib/curation.ts. */}
      <FeaturedOperators locale={locale} />
      <PriceBand />
      <PlanWithConfidence locale={locale} />
      <EndBand />
    </main>
  );
}
