import { getTranslations } from 'next-intl/server';
import { MapPin } from 'lucide-react';

import { BusinessCard } from '@/components/cards/business-card';
import type { Locale } from '@/i18n/routing';
import type { NearbyResult } from '@/lib/trip/near';

/**
 * The list half of near-me, rendered on the server.
 *
 * It has to be. BusinessCard is an async server component — it awaits
 * getTranslations — so rendering it from inside the client component that owns
 * the geolocation button throws "an unknown Component is an async Client
 * Component" and takes the page's error boundary with it. The action therefore
 * returns this element rather than a list of rows.
 *
 * The map is deliberately *not* here, and that is the whole point of the split.
 * PinMap is a client component, and a client component reached only through a
 * server action's return value is not in the route's client manifest, so React
 * cannot resolve it: "Could not find the module in the React Client Manifest",
 * and the page's error boundary takes the whole result. The map is rendered by
 * Nearby instead, which is a real client component in the route's own graph.
 *
 * The query is run once, by the action, and passed in — so the map and the
 * list can never disagree about what was found.
 */
export async function NearbyResults({
  result,
  locale,
}: {
  result: NearbyResult;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: 'nearMe' });

  if (result.cards.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        {t('noneBody')}
      </p>
    );
  }

  return (
    <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {result.cards.map((b) => (
        <li key={b.id}>
          <BusinessCard business={b} />
          {/* A distance only where one is actually known. For a listing placed
              from its town the coordinate is a centroid, and "2.1 km away"
              would be a number nobody measured — the same invented precision
              this site refuses on park fees. */}
          <p className="mt-1.5 flex items-center gap-1 px-1 text-xs text-muted-foreground">
            <MapPin className="size-3" aria-hidden />
            {b.precision === 'exact'
              ? t('away', { km: result.distances[b.id] ?? 0 })
              : b.city
                ? t('inCity', { city: b.city })
                : t('approx')}
          </p>
        </li>
      ))}
    </ul>
  );
}
