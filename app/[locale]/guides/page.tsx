import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { localeAlternates } from '@/lib/seo';
import { getGuides } from '@/lib/queries/guides';
import { GuideCard } from '@/components/cards/guide-card';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { QuoteCta } from '@/components/home/quote-cta';

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
      <div className="container-page pt-10">
        <Breadcrumbs
          locale={locale}
          items={[{ label: 'Explore Tanzania', href: '/' }, { label: tNav('guides') }]}
        />
      </div>

      <div className="container-page pb-section pt-8">
        <h1 className="text-4xl font-semibold sm:text-5xl">{t('title')}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {guides.map((g) => (
            <GuideCard key={g.id} guide={g} />
          ))}
        </div>
      </div>

      <QuoteCta />
    </>
  );
}
