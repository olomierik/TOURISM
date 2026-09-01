import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Compass } from 'lucide-react';

import { locales, type Locale } from '@/i18n/routing';
import { getDestinationAnchors } from '@/lib/queries/taxonomy';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Nearby } from '@/components/trip/nearby';
import { NearbyResults } from '@/components/trip/nearby-results';
import { findNearby } from '@/lib/trip/near';
import { toPins } from '@/lib/trip/pins';

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
    alternates: {
      canonical: '/near-me',
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}/near-me`])),
    },
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
  // planning from a sofa in Hamburg actually wants. Twelve, in the curated
  // order the rest of the site uses — a wall of forty-six chips is a list, not
  // a choice.
  const anchors = allAnchors.slice(0, 12);

  // The opening set of results, rendered here on the server.
  //
  // Two reasons, and the second is the one that matters.
  //
  // A page called "what is around you" that shows nothing until you press a
  // button is an empty room. Answering for the first destination gives it
  // something to be, and a prerendered page pays for the query once.
  //
  // And it is what makes the results work at all. The card tree contains
  // client components — next/image and the translated Link — and a client
  // component reached only through a server action's return value is not in
  // this route's client manifest, so React cannot resolve it and every search
  // lands in the error boundary. That manifest is built from this page's
  // module graph. Rendering the cards here puts them in it, which is what lets
  // the action render them too.
  const opening = anchors[0];
  const openingKm = 50;
  const openingResult = await findNearby(opening.lat, opening.lng, openingKm, locale);

  return (
    <div className="container-page py-10">
      <Breadcrumbs
        locale={locale}
        items={[{ label: 'Explore Tanzania', href: '/' }, { label: tNav('nearMe') }]}
      />

      <header className="mt-8 max-w-3xl">
        <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <Compass className="size-4" aria-hidden />
          {t('eyebrow')}
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">{t('h1')}</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">{t('intro')}</p>
      </header>

      <div className="mt-10">
        <Nearby
          anchors={anchors}
          locale={locale}
          initial={{
            count: openingResult.cards.length,
            pins: toPins(openingResult, locale),
            list: <NearbyResults result={openingResult} locale={locale} />,
            place: opening.name,
            km: openingKm,
            lat: opening.lat,
            lng: opening.lng,
          }}
        />
      </div>
    </div>
  );
}
