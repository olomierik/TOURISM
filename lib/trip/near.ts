import { createSearchClient } from '@/lib/supabase/public';
import { getBusinessCardsByIds } from '@/lib/queries/businesses';
import type { Locale } from '@/i18n/routing';

/**
 * Approved listings near a point.
 *
 * Reached through a server action rather than a route, because a viewer's
 * position must not travel in a URL: query strings end up in server logs,
 * referrer headers and browser history, and a location is the one thing on this
 * site that is about the person rather than the place. Nothing here writes it
 * down either — the coordinates build one query and are then discarded.
 *
 * The position is used at full precision. It used to be rounded to two decimal
 * places — a little over a kilometre — as a privacy measure, but that protected
 * nothing: the coordinate builds one query and is discarded either way, and the
 * only effect was moving every result by up to a kilometre and telling people
 * the wrong distance. Privacy here comes from not storing it and not putting it
 * in a URL, which is where it actually comes from.
 */

export type NearbyResult = {
  /**
   * Each card carries its own `precision` and `city`, which is what decides
   * whether a distance may be printed: 'city' means the coordinate is a
   * centroid — good enough to order results and to say "in Nairobi", and not
   * good enough for a number, because the real address may be twenty
   * kilometres from it. Those are read off the card rather than returned
   * separately, so there is one answer to "where is this" and not two that
   * could drift apart.
   */
  cards: Awaited<ReturnType<typeof getBusinessCardsByIds>>;
  /** The only thing the RPC knows that the card does not. */
  distances: Record<string, number>;
};

const RADII = [10, 25, 50, 100, 200] as const;
export type Radius = (typeof RADII)[number];

export async function findNearby(
  lat: number,
  lng: number,
  radiusKm: number,
  locale: Locale,
): Promise<NearbyResult> {
  const empty: NearbyResult = { cards: [], distances: {} };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return empty;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return empty;

  const radius = (RADII as readonly number[]).includes(radiusKm) ? radiusKm : 50;

  // Six decimal places is roughly a tenth of a metre — the position is passed
  // through as the browser reported it. It was rounded to ~1km, which was a
  // privacy measure that cost accuracy for no gain: the coordinate is used to
  // build one query and is never written down, so blunting it protected
  // nothing and moved every result by up to a kilometre.
  const round = (v: number) => Math.round(v * 1e6) / 1e6;

  // no-store: this result is per-viewer by definition and must never land in a
  // shared cache, which is the same reason search uses this client.
  const supabase = createSearchClient();

  const { data, error } = await supabase.rpc('businesses_near', {
    p_lat: round(lat),
    p_lng: round(lng),
    p_radius_km: radius,
    p_limit: 24,
  });

  // The type generator emits `Returns: unknown` for a set-returning function,
  // so the shape is asserted here against what 039 actually declares. Narrow
  // rather than `any`: if the migration's return columns change, this line is
  // the one place that has to be updated with them.
  const rows = (data ?? []) as Array<{ id: string; distance_km: number }>;

  if (error || rows.length === 0) return empty;

  const distances = Object.fromEntries(
    rows.map((r) => [r.id, Math.round(r.distance_km * 10) / 10]),
  );

  // Resolved through the directory's own card query, so a nearby listing shows
  // the same name, rating and cover it shows everywhere else — and one that has
  // since been suspended drops out rather than rendering a card going nowhere.
  const cards = await getBusinessCardsByIds(
    rows.map((r) => r.id),
    locale,
  );

  // The RPC returns nearest first; getBusinessCardsByIds does not promise an
  // order, so it is restored here rather than assumed.
  cards.sort((a, b) => (distances[a.id] ?? Infinity) - (distances[b.id] ?? Infinity));

  return { cards, distances };
}
