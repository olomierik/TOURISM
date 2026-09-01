import { getPathname } from '@/i18n/navigation';
import type { Pin } from '@/components/map/pin-map';
import type { Locale } from '@/i18n/routing';
import type { NearbyResult } from '@/lib/trip/near';

/**
 * Map pins for a set of nearby results.
 *
 * Shared by the near-me page and the near-me action, which both need them and
 * must not build them differently: the page renders the opening set and the
 * action renders every set after it, and a traveller who searches should not
 * see the map change its mind about what a pin means.
 *
 * Built from the cards rather than from a second query, so the map and the
 * list cannot disagree about what was found. A listing with no coordinates is
 * dropped rather than defaulted — 0,0 is a real point in the Gulf of Guinea
 * and would stretch the map's bounds across the Atlantic.
 */
export function toPins(result: NearbyResult, locale: Locale): Pin[] {
  return result.cards.flatMap((c) =>
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
            // The listing route is translated, so the link is built for this
            // locale rather than leaning on a middleware redirect.
            href: getPathname({
              href: { pathname: '/business/[slug]', params: { slug: c.slug } },
              locale,
            }),
          },
        ],
  );
}
