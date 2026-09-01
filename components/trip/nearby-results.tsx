import { getTranslations } from 'next-intl/server';
import { MapPin } from 'lucide-react';

import { BusinessCard } from '@/components/cards/business-card';
import { PinMap, type Pin } from '@/components/map/pin-map';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { findNearby } from '@/lib/trip/near';

/**
 * The results half of near-me, rendered on the server.
 *
 * It has to be. BusinessCard is an async server component — it awaits
 * getTranslations — so rendering it from inside the client component that owns
 * the geolocation button throws "an unknown Component is an async Client
 * Component" and takes the page's error boundary with it.
 *
 * So the action returns this element rather than a list of rows, and the
 * cards render where translations exist. The client keeps only what it must:
 * the button, the radius chips, and wherever this ends up.
 */
export async function NearbyResults({
  lat,
  lng,
  radiusKm,
  locale,
  place,
}: {
  lat: number;
  lng: number;
  radiusKm: number;
  locale: Locale;
  place: string;
}) {
  const [result, t] = await Promise.all([
    findNearby(lat, lng, radiusKm, locale),
    getTranslations({ locale, namespace: 'nearMe' }),
  ]);

  // Built from the cards that are already loaded, so the map and the list can
  // never disagree about what was found.
  const pins: Pin[] = result.cards.flatMap((c) =>
    c.lat === null || c.lng === null
      ? []
      : [
          {
            id: c.id,
            slug: c.slug,
            name: c.name,
            lat: c.lat,
            lng: c.lng,
            isVerified: c.isVerified,
            tagline: c.tagline,
            precision: c.precision,
            city: c.city,
            href: getPathname({
              href: { pathname: '/business/[slug]', params: { slug: c.slug } },
              locale,
            }),
          },
        ],
  );

  return (
    <>
      <h2 className="font-display text-xl font-semibold">
        {result.cards.length === 0
          ? t('noneFound', { place, km: radiusKm })
          : t('found', { count: result.cards.length, place, km: radiusKm })}
      </h2>

      {/* The map before the list, because "near me" is a question about space
          and a list of names is a poor answer to it. Listings placed from a
          town name are drawn as a soft area rather than a pin — the same
          distinction the labels below make in words. */}
      {pins.length > 0 && (
        <PinMap
          pins={pins}
          center={{ lat, lng }}
          // `place` is already 'your location' or the chip's name.
          you={{ lat, lng, label: place }}
          label={t('mapLabel')}
          className="mt-6"
        />
      )}

      {result.cards.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          {t('noneBody')}
        </p>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.cards.map((b) => (
            <li key={b.id}>
              <BusinessCard business={b} />
              {/* A distance only where one is actually known. For a listing
                  placed from its city name the coordinate is a centroid, and
                  "2.1 km away" would be a number nobody measured — the same
                  invented precision this site refuses on park fees. */}
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
      )}
    </>
  );
}
