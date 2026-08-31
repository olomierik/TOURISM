'use server';

import type { ReactNode } from 'react';

import type { Locale } from '@/i18n/routing';
import { NearbyResults } from '@/components/trip/nearby-results';

/**
 * The one thing the near-me client component is allowed to call.
 *
 * It returns an element rather than data, which looks unusual and is the only
 * shape that works: the cards are async server components, so they must render
 * on the server, and the trigger (a geolocation prompt) can only happen on the
 * client. A server action returning JSX is the bridge between those two facts.
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
  place: string,
): Promise<ReactNode> {
  return <NearbyResults lat={lat} lng={lng} radiusKm={radiusKm} locale={locale} place={place} />;
}
