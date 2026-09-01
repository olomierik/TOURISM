'use server';

import type { ReactNode } from 'react';

import type { Locale } from '@/i18n/routing';
import type { Pin } from '@/components/map/pin-map';
import { NearbyResults } from '@/components/trip/nearby-results';
import { findNearby } from '@/lib/trip/near';
import { toPins } from '@/lib/trip/pins';

/**
 * The one thing the near-me client component is allowed to call.
 *
 * It returns a mixture of data and one element, which looks unusual and is the
 * only shape that works.
 *
 * The cards are async server components, so they must render on the server,
 * and the trigger — a geolocation prompt — can only happen on the client. A
 * server action returning JSX is the bridge between those two facts.
 *
 * The map cannot come back the same way. PinMap is a client component, and a
 * client component reached only through a server action's return value is not
 * in the route's client manifest — React cannot resolve the reference and the
 * whole result lands in the error boundary. So the pins come back as plain
 * data and Nearby, which is a genuine part of the route's client graph,
 * renders the map itself.
 *
 * The query runs once here and feeds both, so the map and the list cannot
 * disagree about what was found.
 *
 * It also keeps the position off the wire in every other sense — no query
 * string, no route, no log line. The arguments arrive in a POST body, are used
 * to build one query, and are not written down.
 */
export async function nearbyResults(
  lat: number,
  lng: number,
  radiusKm: number,
  locale: Locale,
): Promise<{ count: number; pins: Pin[]; list: ReactNode }> {
  const result = await findNearby(lat, lng, radiusKm, locale);

  const pins = toPins(result, locale);

  return {
    count: result.cards.length,
    pins,
    list: <NearbyResults result={result} locale={locale} />,
  };
}
