import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

import { Hero } from '@/components/home/hero';
import {
  FeaturedOperators,
  PopularDestinations,
  LatestGuides,
} from '@/components/home/home-sections';
import { CategoryGrid } from '@/components/home/category-grid';
import {
  EventsStrip,
  NearMeTeaser,
  ListBusinessCta,
  Newsletter,
} from '@/components/home/discovery-sections';
import { TrustStrip, HowItWorks, QuoteBanner } from '@/components/home/savanna-sections';
import { getHeroFrames } from '@/lib/queries/hero';
import { getDestinations, getCategoriesWithCounts } from '@/lib/queries/taxonomy';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [frames, destinations, categories] = await Promise.all([
    getHeroFrames(locale),
    getDestinations(locale, { limit: 12 }),
    getCategoriesWithCounts(locale),
  ]);

  const heroCategories = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
  }));

  return (
    <main className="flex flex-col w-full">
      {/* Savanna Modern (2026-10). */}
      {/* 1. HERO, SEARCH AND THE FOUR FACTS UNDER IT */}
      <Hero frames={frames} destinations={destinations} categories={heroCategories} />
      <TrustStrip locale={locale} />

      {/* 2. WHERE, WHO AND HOW */}
      <PopularDestinations locale={locale} />
      <FeaturedOperators locale={locale} />
      <HowItWorks />
      <CategoryGrid locale={locale} categories={categories} />

      {/* 3. GUIDES, THE QUOTE BANNER & LOCAL EVENTS. The banner sits between
          the guides and the events rather than beside the near-me panel: both
          are navy, and two dark blocks in a row read as one heavy band. */}
      <LatestGuides locale={locale} />
      <QuoteBanner destinations={destinations} />
      <EventsStrip locale={locale} />
      <NearMeTeaser locale={locale} />

      {/* 4. CONVERSION. The platform facts that stood here now sit in the
          trust strip under the hero, where they are read. */}
      <ListBusinessCta locale={locale} />
      <Newsletter locale={locale} />
    </main>
  );
}
