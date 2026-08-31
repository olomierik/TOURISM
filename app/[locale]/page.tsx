import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { Hero } from '@/components/home/hero';
import {
  EventsStrip,
  ListBusinessCta,
  NearMeTeaser,
  Newsletter,
  WhyExploreTanzania,
} from '@/components/home/discovery-sections';
import type { HeroFrame } from '@/components/home/hero-backdrop';
import { getHeroFrames } from '@/lib/queries/hero';
import { getCategoriesWithCounts } from '@/lib/queries/taxonomy';
import { QuoteCta } from '@/components/home/quote-cta';
import { CategoryGrid } from '@/components/home/category-grid';
import { ExploreAfrica } from '@/components/home/explore-africa';
import {
  PopularDestinations,
  FeaturedOperators,
  LatestGuides,
} from '@/components/home/home-sections';
import { getDestinations } from '@/lib/queries/taxonomy';

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
  // The planner needs the destination list, and the hero needs its frames.
  // Fetched together so the homepage makes one round of queries, not two.
  const [heroPool, destinations, allCategories] = await Promise.all([
    getHeroFrames(locale),
    getDestinations(locale),
    getCategoriesWithCounts(locale),
  ]);

  // The query already drops categories with nothing behind them. Five of the
  // nine a general directory would advertise do not exist here, and a select
  // offering "Real Estate" that returns nothing is the empty promise this site
  // spends the rest of its pages avoiding.
  const heroCategories = allCategories.map((c) => ({ slug: c.slug, name: c.name }));

  const frames: HeroFrame[] = [
    ...(localHero ? [{ src: localHero, label: null }] : []),
    ...heroPool,
  ];

  return (
    <>
      <Hero frames={frames} destinations={destinations} categories={heroCategories} />

      {/* Categories first, directly under the search. Somebody who did not know
          what to type needs to see what there is to look for, and that answer
          belongs above the scenery rather than three sections into it. */}
      <CategoryGrid locale={locale} />
      <PopularDestinations locale={locale} />
      <FeaturedOperators locale={locale} />

      {/* Events break the rhythm on purpose. Four sections of identical cards is
          where a homepage stops being scannable and becomes wallpaper. */}
      <EventsStrip locale={locale} />

      <LatestGuides locale={locale} />
      <NearMeTeaser locale={locale} />

      {/* Sits late now: this site's subject is Tanzania, and the continent-wide
          list is the widening rather than the headline. */}
      <ExploreAfrica locale={locale} />

      <WhyExploreTanzania locale={locale} />
      <QuoteCta />
      <ListBusinessCta locale={locale} />
      <Newsletter locale={locale} />
    </>
  );
}
