import { setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';

import { Hero } from '@/components/home/hero';
import { QuoteCta } from '@/components/home/quote-cta';

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
      {/*
        Popular destinations, categories, featured operators and guides land here
        in Phase 3 — each is database-driven, so they arrive with the schema.
      */}
      <QuoteCta />
    </>
  );
}
