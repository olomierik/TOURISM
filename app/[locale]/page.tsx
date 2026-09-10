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
  WhyExploreTanzania,
  ListBusinessCta,
  Newsletter,
} from '@/components/home/discovery-sections';
import { QuoteCta } from '@/components/home/quote-cta';
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
      {/* 1. HERO & SEARCH */}
      <Hero frames={frames} destinations={destinations} categories={heroCategories} />

      {/* 2. INVENTORY & DISCOVERY */}
      <FeaturedOperators locale={locale} />
      <PopularDestinations locale={locale} />
      <CategoryGrid locale={locale} categories={categories} />

      {/* 3. GUIDES & LOCAL EVENTS */}
      <LatestGuides locale={locale} />
      <EventsStrip locale={locale} />
      <NearMeTeaser locale={locale} />

      {/* 4. CONVERSION & PLATFORM FACTS */}
      <WhyExploreTanzania locale={locale} />
      <QuoteCta />
      <ListBusinessCta locale={locale} />
      <Newsletter locale={locale} />
    </main>
  );
}
