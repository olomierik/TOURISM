import { setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { Hero } from '@/components/home/hero';
import { QuoteCta } from '@/components/home/quote-cta';
import { CategoryGrid } from '@/components/home/category-grid';
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

  return (
    <>
      <Hero />
      <PopularDestinations locale={locale} />
      <CategoryGrid locale={locale} />
      <FeaturedOperators locale={locale} />
      <LatestGuides locale={locale} />
      <QuoteCta />
    </>
  );
}
