import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Calculator } from 'lucide-react';

import { locales, type Locale } from '@/i18n/routing';
import { getCostableDestinations } from '@/lib/queries/taxonomy';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { CostEstimator } from '@/components/trip/cost-estimator';
import { CostTable } from '@/components/trip/cost-table';
import { PageHero } from '@/components/layout/page-hero';

type Params = { locale: Locale };

/**
 * "What will this actually cost?"
 *
 * The destination pages answer that one park at a time, which is the shape the
 * data has and not the shape the question has. Nobody spends five nights in the
 * Serengeti and goes home; they spend three there, two at Ngorongoro, and want
 * one number for the trip. Doing that sum by hand across five tabs is the point
 * at which people give up and post "is $4,000 reasonable?" on a forum.
 *
 * The arithmetic is in lib/trip/cost.ts with 40 assertions on it, because the
 * failure mode here is silent: a double-counted park fee produces a total 30%
 * too high, nothing errors, and the reader simply concludes the trip is out of
 * reach. See that file for the four rules it holds.
 */
export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tripCost' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: '/trip-cost',
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}/trip-cost`])),
    },
  };
}

export default async function TripCostPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // No session read here on purpose. This page used to call
  // supabase.auth.getUser(), which is a cookies() read, which is a Request-time
  // API — so the whole route rendered per visitor and could not be cached, for
  // the sake of one Save button. The estimator resolves the session in the
  // browser instead (see CostEstimator's isSignedIn prop).
  const [destinations, t, tNav] = await Promise.all([
    getCostableDestinations(locale),
    getTranslations('tripCost'),
    getTranslations('nav'),
  ]);

  return (
    <>
      <PageHero
        width="wide"
        breadcrumbs={
          <Breadcrumbs
            locale={locale}
            items={[{ label: 'Explore Tanzania', href: '/' }, { label: tNav('tripCost') }]}
          />
        }
        icon={Calculator}
        eyebrow={t('eyebrow')}
        title={t('h1')}
        lead={t('intro', { count: destinations.length })}
      />

      <div className="container-page py-6 sm:py-10">

      <div>
        {/* The estimator reads the trip out of the query string, and
            useSearchParams needs a boundary or this page stops being static.
            Same pattern as the login form. */}
        <Suspense fallback={<div className="h-96" />}>
          <CostEstimator destinations={destinations} locale={locale} />
        </Suspense>
      </div>

      {/* Outside the Suspense boundary, and that is the point: everything above
          is a client component whose fallback is an empty div, so a crawler saw
          a page with no prices on it. These are the same figures as ordinary
          server-rendered HTML. */}
      <CostTable destinations={destinations} locale={locale} />

      <p className="mt-12 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        {t('disclaimer')}
      </p>
      </div>
    </>
  );
}
