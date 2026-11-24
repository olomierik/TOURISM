import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Compass } from 'lucide-react';

import { locales, type Locale } from '@/i18n/routing';
import { localeAlternates } from '@/lib/seo';
import { getCategories, getDestinationAnchors } from '@/lib/queries/taxonomy';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Nearby } from '@/components/trip/nearby';
import { NearbyResults } from '@/components/trip/nearby-results';
import { findNearby, findNearbyCategories } from '@/lib/trip/near';
import { toPins } from '@/lib/trip/pins';
import { TOWNS, QUICK_TOWNS } from '@/lib/trip/towns';
import { PageHero } from '@/components/layout/page-hero';

type Params = { locale: Locale };

/**
 * "What is around me right now."
 *
 * 922 of the approved listings carry coordinates and nothing read them except
 * the destination map. Somebody standing in Arusha with a free afternoon could
 * browse a category and hope; they could not ask the question they actually
 * had.
 *
 * The page is prerendered, including an opening set of results for the first
 * destination, so it says something before anybody presses anything. Searches
 * after that are not prerendered: coordinates go through a server action
 * rather than a query string, because a position in a URL ends up in logs,
 * referrers and history, and it is the one thing on this site that is about
 * the person rather than the place.
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
  const t = await getTranslations({ locale, namespace: 'nearMe' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    // From the route table: the hand-built /{l}/near-me paths used the English
    // route word everywhere and an /en prefix, so every alternate redirected.
    alternates: localeAlternates('/near-me', locale),
  };
}

export default async function NearMePage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [allAnchors, t, tNav] = await Promise.all([
    getDestinationAnchors(locale),
    getTranslations('nearMe'),
    getTranslations('nav'),
  ]);

  // Somewhere to search from when the browser says no, and the thing somebody
  // planning from a sofa in Hamburg actually wants: the towns people land and
  // stay in first (car hire and hotels are asked about towns), then every
  // destination with a position. Names are unique across the two lists.
  const townNames = new Set(TOWNS.map((t) => t.name.toLowerCase()));
  const anchors = [
    ...TOWNS.map(({ name, lat, lng }) => ({ name, lat, lng })),
    ...allAnchors.filter((a) => !townNames.has(a.name.toLowerCase())),
  ];

  const opening = anchors[0];
  const openingKm = 50;
  // Both together: the chips are labelled with these counts, so they belong to
  // the same query as the listings they sit above.
  const [openingResult, openingCounts, categories] = await Promise.all([
    findNearby(opening.lat, opening.lng, openingKm, locale),
    findNearbyCategories(opening.lat, opening.lng, openingKm),
    getCategories(locale),
  ]);

  return (
    <>
      <PageHero
        width="wide"
        breadcrumbs={
          <Breadcrumbs
            locale={locale}
            items={[{ label: 'Explore Tanzania', href: '/' }, { label: tNav('nearMe') }]}
          />
        }
        icon={Compass}
        eyebrow={t('eyebrow')}
        title={t('h1')}
        lead={t('intro')}
      />

      <div className="container-page py-6 sm:py-10">

      <div>
        <Nearby
          anchors={anchors}
          quickPlaces={QUICK_TOWNS}
          categories={categories.map((c) => ({ id: c.id, key: c.key, name: c.name }))}
          locale={locale}
          initial={{
            count: openingResult.cards.length,
            pins: toPins(openingResult, locale),
            list: <NearbyResults result={openingResult} locale={locale} />,
            place: opening.name,
            km: openingKm,
            lat: opening.lat,
            lng: opening.lng,
            categoryCounts: openingCounts,
          }}
        />
      </div>
      </div>
    </>
  );
}
