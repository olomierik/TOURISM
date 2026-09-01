import { getTranslations } from 'next-intl/server';

import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getMapPins } from '@/lib/queries/taxonomy';
import { PinMap } from '@/components/map/pin-map';

/**
 * The map section on a destination page.
 *
 * Server component so the query stays on the server and the page stays
 * prerendered; only the leaflet canvas below is client-side, and only once it
 * is nearly on screen.
 *
 * Renders nothing when no listing near this destination has coordinates. 1,257
 * of 1,330 approved listings do since migrations 045 and 047 placed the ones
 * that arrived with a town or a postal code, but 73 still have nothing to
 * place them by — and an empty grey rectangle is worse than no section.
 */
export async function DestinationMap({
  destinationId,
  destinationName,
  center,
  locale,
}: {
  destinationId: string;
  destinationName: string;
  center: { lat: number; lng: number } | null;
  locale: Locale;
}) {
  const [pins, t] = await Promise.all([
    getMapPins(destinationId, locale),
    getTranslations({ locale, namespace: 'map' }),
  ]);

  if (pins.length === 0) return null;

  return (
    <section className="container-page pb-section">
      <h2 className="font-display text-2xl font-semibold">
        {t('title', { name: destinationName })}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('subtitle', { count: pins.length })}
      </p>
      <div className="mt-5">
        <PinMap
          pins={pins.map((p) => ({
            ...p,
            // The listing route is translated, so the link is built for this
            // locale rather than leaning on a middleware redirect.
            href: getPathname({
              href: { pathname: '/business/[slug]', params: { slug: p.slug } },
              locale,
            }),
          }))}
          center={center}
          label={t('title', { name: destinationName })}
        />
      </div>
    </section>
  );
}
