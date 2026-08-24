import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { Hero } from '@/components/home/hero';
import type { HeroFrame } from '@/components/home/hero-backdrop';
import { getHeroFrames } from '@/lib/queries/hero';
import { QuoteCta } from '@/components/home/quote-cta';
import { CategoryGrid } from '@/components/home/category-grid';
import { ExploreAfrica } from '@/components/home/explore-africa';
import {
  PopularDestinations,
  FeaturedOperators,
  LatestGuides,
} from '@/components/home/home-sections';

export default async function HomePage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // The file is checked for rather than assumed: a missing one would render as a
  // broken image across the full height of the homepage. Several extensions are
  // accepted because the most likely way this goes wrong is someone saving a
  // .png and finding nothing changed.
  const localHero =
    ['hero.jpg', 'hero.jpeg', 'hero.png', 'hero.webp', 'hero.avif']
      .map((f) => (existsSync(join(process.cwd(), 'public', f)) ? `/${f}` : null))
      .find(Boolean) ?? null;

  // Destination covers make up the rest of the rotation. They are admin-curated
  // and each one represents a place, so the hero doubles as a statement of what
  // the site actually covers.
  //
  // Capped rather than cycling all of them: a visitor should not be fetching
  // forty photographs to look at a homepage. Ordered by featured-then-sort so
  // the selection is deliberate rather than whatever the database returns first.
  const heroPool = await getHeroFrames(locale);

  const frames: HeroFrame[] = [
    ...(localHero ? [{ src: localHero, label: null }] : []),
    ...heroPool,
  ];

  return (
    <>
      <Hero frames={frames} />
      <PopularDestinations locale={locale} />
      <CategoryGrid locale={locale} />
      {/* Sits after the Tanzanian grid: this site's subject is still Tanzania,
          and the continent-wide list is the widening, not the headline. */}
      <ExploreAfrica locale={locale} />
      <FeaturedOperators locale={locale} />
      <LatestGuides locale={locale} />
      <QuoteCta />
    </>
  );
}
