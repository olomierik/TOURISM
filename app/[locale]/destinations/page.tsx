import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { localeAlternates } from '@/lib/seo';
import { getDestinations } from '@/lib/queries/taxonomy';
import { DestinationCard } from '@/components/cards/destination-card';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { QuoteCta } from '@/components/home/quote-cta';

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pageTitles' });
  const tHome = await getTranslations({ locale, namespace: 'home.destinations' });

  return {
    title: t('destinations'),
    description: tHome('subtitle'),
    alternates: localeAlternates('/destinations', locale),
  };
}

export default async function DestinationsPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [destinations, t, tNav] = await Promise.all([
    getDestinations(locale),
    getTranslations('home.destinations'),
    getTranslations('nav'),
  ]);

  return (
    <>
      <div className="container-page pt-10">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: 'Explore Tanzania', href: '/' },
            { label: tNav('destinations') },
          ]}
        />
      </div>

      <div className="container-page pb-section pt-8">
        <h1 className="text-4xl font-semibold sm:text-5xl">{t('title')}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((d) => (
            <DestinationCard key={d.id} destination={d} />
          ))}
        </div>
      </div>

      <QuoteCta />
    </>
  );
}
