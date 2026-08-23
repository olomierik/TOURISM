import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { Hero } from '@/components/home/hero';
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

  // Checked rather than assumed: a missing file would otherwise render as a
  // broken image across the full height of the homepage. Without one the drawn
  // scene stays, so dropping a photograph in is the only step needed to change
  // the hero — no environment variable, no deploy config.
  //
  // Several extensions are accepted because the most likely way this goes wrong
  // is someone saving a .png or a .webp and finding nothing changed.
  const backdrop =
    ['hero.jpg', 'hero.jpeg', 'hero.png', 'hero.webp', 'hero.avif']
      .map((f) => (existsSync(join(process.cwd(), 'public', f)) ? `/${f}` : null))
      .find(Boolean) ?? null;

  return (
    <>
      <Hero backdrop={backdrop} />
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
