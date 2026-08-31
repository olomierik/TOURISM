import { getTranslations } from 'next-intl/server';
import { MapPin } from 'lucide-react';

import { BusinessCard } from '@/components/cards/business-card';
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

  return (
    <>
      <h2 className="font-display text-xl font-semibold">
        {result.cards.length === 0
          ? t('noneFound', { place, km: radiusKm })
          : t('found', { count: result.cards.length, place, km: radiusKm })}
      </h2>

      {result.cards.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          {t('noneBody')}
        </p>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.cards.map((b) => (
            <li key={b.id}>
              <BusinessCard business={b} />
              <p className="mt-1.5 flex items-center gap-1 px-1 text-xs text-muted-foreground">
                <MapPin className="size-3" aria-hidden />
                {t('away', { km: result.distances[b.id] ?? 0 })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
