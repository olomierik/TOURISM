import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PawPrint } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { localeAlternates } from '@/lib/seo';
import { SPECIES, BIG_FIVE, toCard } from '@/lib/wildlife/species';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { PageHero } from '@/components/layout/page-hero';
import { SpeciesLibrary } from '@/components/wildlife/species-library';
import { MySafari } from '@/components/wildlife/my-safari';

type Params = { locale: Locale };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'wildlife' });
  return {
    title: t('pageTitle', { count: SPECIES.length }),
    description: t('metaDescription'),
    alternates: localeAlternates('/wildlife', locale),
    openGraph: {
      title: t('pageTitle', { count: SPECIES.length }),
      description: t('metaDescription'),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('pageTitle', { count: SPECIES.length }),
      description: t('metaDescription'),
    },
  };
}

/**
 * The wildlife guide: every feature in one place.
 *
 * The library is public and filterable in the browser; the "your safari"
 * panel above it reads the signed-in traveller's diary (migration 070) for the
 * seen marks, progress and badges, and invites everyone else to start one.
 */
export default async function WildlifePage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, tNav] = await Promise.all([getTranslations('wildlife'), getTranslations('nav')]);

  const cards = SPECIES.map(toCard);

  // What the badge rules read, and nothing else. The panel computes progress
  // in the browser — see components/wildlife/my-safari — because knowing which
  // animals this reader has seen means reading their session, and a cookies()
  // call here would make all 192 guide pages dynamic.
  const achievementSpecies = SPECIES.map((s) => ({
    slug: s.slug,
    group: s.group,
    bigFive: s.bigFive,
    rarity: s.rarity,
  }));

  const stats = [
    { label: t('stats.species'), value: SPECIES.length },
    { label: t('stats.bigFive'), value: BIG_FIVE.length },
    { label: t('stats.calls'), value: SPECIES.filter((s) => s.call).length },
  ];

  return (
    <>
      <PageHero
        breadcrumbs={
          <Breadcrumbs
            locale={locale}
            items={[{ label: 'Explore Tanzania', href: '/' }, { label: tNav('wildlife') }]}
          />
        }
        icon={PawPrint}
        eyebrow={t('eyebrow')}
        title={t('title')}
        lead={t('lead', { count: SPECIES.length })}
      >
        {/* Desktop only: on a phone the count line above the grid says it. */}
        <dl className="hidden flex-wrap gap-x-10 gap-y-4 sm:flex">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-overline font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </dt>
              <dd className="font-display text-heading-xl font-semibold lining-nums tabular-nums text-foreground">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </PageHero>

      <div className="container-page py-6 sm:py-10">
        <MySafari species={achievementSpecies} bigFiveTotal={BIG_FIVE.length} />

        <SpeciesLibrary species={cards} />
      </div>
    </>
  );
}
