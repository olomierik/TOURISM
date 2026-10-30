import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, BookOpenCheck, Crown, PawPrint } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { SPECIES, BIG_FIVE, toCard } from '@/lib/wildlife/species';
import { computeAchievements } from '@/lib/wildlife/achievements';
import { getMySightings } from '@/lib/wildlife/sightings';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { PageHero } from '@/components/layout/page-hero';
import { Button } from '@/components/ui/button';
import { SpeciesLibrary } from '@/components/wildlife/species-library';
import { AchievementGrid } from '@/components/wildlife/achievement-grid';

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

  const [t, tNav, mine] = await Promise.all([
    getTranslations('wildlife'),
    getTranslations('nav'),
    getMySightings(),
  ]);

  const cards = SPECIES.map(toCard);
  const seenSlugs = mine.user ? [...new Set(mine.sightings.map((s) => s.species_slug))] : null;
  const known = new Set(SPECIES.map((s) => s.slug));
  const seenCount = (seenSlugs ?? []).filter((s) => known.has(s)).length;
  const bigFiveSeen = BIG_FIVE.filter((s) => seenSlugs?.includes(s.slug)).length;
  const achievements = computeAchievements(seenSlugs ?? [], SPECIES);
  const earned = achievements.filter((a) => a.done).length;

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
        <dl className="mt-2 flex flex-wrap gap-x-10 gap-y-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-overline font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </dt>
              <dd className="font-display text-display-lg font-semibold lining-nums tabular-nums text-foreground">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </PageHero>

      <div className="container-page py-10 sm:py-14">
        {/* Your safari */}
        <section
          aria-labelledby="my-safari"
          className="mb-10 overflow-hidden rounded-xl border bg-surface-muted"
        >
          {mine.user ? (
            <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,18rem)_1fr] lg:items-center">
              <div>
                <p className="eyebrow">{t('mySafari.title')}</p>
                <h2 id="my-safari" className="mt-2 font-display text-heading-lg font-semibold">
                  {t('mySafari.seenOf', { seen: seenCount, total: SPECIES.length })}
                </h2>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-pill bg-surface-sunken"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={SPECIES.length}
                  aria-valuenow={seenCount}
                  aria-label={t('mySafari.title')}
                >
                  <div
                    className="h-full rounded-pill bg-gold"
                    style={{ width: `${Math.round((seenCount / SPECIES.length) * 100)}%` }}
                  />
                </div>
                <p className="mt-3 flex items-center gap-2 text-body-sm text-muted-foreground">
                  <Crown className="size-4 text-gold" aria-hidden />
                  {t('mySafari.bigFive', { seen: bigFiveSeen, total: BIG_FIVE.length })}
                  <span aria-hidden>·</span>
                  {t('mySafari.badges', { count: earned })}
                </p>
                <Button asChild className="mt-5">
                  <Link href="/account/sightings">
                    <BookOpenCheck className="size-4" aria-hidden />
                    {t('mySafari.openDiary')}
                  </Link>
                </Button>
              </div>
              <AchievementGrid achievements={achievements} limit={5} />
            </div>
          ) : (
            <div className="flex flex-col gap-5 p-5 sm:p-7 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow">{t('mySafari.title')}</p>
                <h2 id="my-safari" className="mt-2 font-display text-heading-lg font-semibold">
                  {t('mySafari.signedOutTitle')}
                </h2>
                <p className="mt-2 text-body text-muted-foreground">{t('mySafari.signedOutBody')}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Button asChild>
                  <Link href={{ pathname: '/login', query: { next: '/account/sightings' } }}>
                    {t('mySafari.signIn')}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={{ pathname: '/register', query: { next: '/account/sightings' } }}>
                    {t('mySafari.register')}
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </section>

        <SpeciesLibrary species={cards} seenSlugs={seenSlugs} />
      </div>
    </>
  );
}
