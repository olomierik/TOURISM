import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { localeAlternates } from '@/lib/seo';
import { getGuides } from '@/lib/queries/guides';
import { GuideCard } from '@/components/cards/guide-card';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { EndBand } from '@/components/home/sections';
import { PageHero } from '@/components/layout/page-hero';

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pageTitles' });
  const tHome = await getTranslations({ locale, namespace: 'home.guides' });

  return {
    title: t('guides'),
    description: tHome('subtitle'),
    alternates: localeAlternates('/guides', locale),
  };
}

export default async function GuidesPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [guides, t, tNav] = await Promise.all([
    getGuides(locale),
    getTranslations('home.guides'),
    getTranslations('nav'),
  ]);

  return (
    <>
      <PageHero
        breadcrumbs={
          <Breadcrumbs
            locale={locale}
            items={[{ label: 'Explore Tanzania', href: '/' }, { label: tNav('guides') }]}
          />
        }
        eyebrow={tNav('guides')}
        title={t('title')}
        lead={t('subtitle')}
      />

      <div className="container-page pb-section pt-6">
        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {guides.map((g) => (
            <GuideCard key={g.id} guide={g} />
          ))}
        </div>
      </div>

      <EndBand />
    </>
  );
}
