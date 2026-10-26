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
  TrustStrip,
  WhereAndWhen,
} from '@/components/home/sections';
import { getHeroFrames } from '@/lib/queries/hero';
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

  const [frames, destinations, categories] = await Promise.all([
    getHeroFrames(locale),
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
      <Hero frames={frames} destinations={options} />
      <TrustStrip locale={locale} />
      {/* SampleQuotes is gone (2026-10, owner's call). §7.1.3 specced a
          "What you get back" block of QuoteCards labelled Example, to stand in
          until real anonymised quotes exist. With placeholder names — "Example
          operator 1" — and invented prices, it read as a mock-up left in by
          mistake rather than as an illustration. The component stays in
          components/home/sections.tsx for when there is real data to put in
          it. */}
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
