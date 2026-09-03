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

/**
 * How many listings one search returns.
 *
 * Exported because the page has to be able to tell a complete answer from a
 * truncated one. Within 50km of the Serengeti there are 86 hotels; this returns
 * the nearest 24 of them, and a heading that reads '24 listings within 50 km'
 * states a total that is not true. The reader can now see both numbers at once
 * — the chips say 86 — so the difference has to be said out loud.
 */
export const NEAR_LIMIT = 24;

export async function findNearby(
  lat: number,
  lng: number,
  radiusKm: number,
  locale: Locale,
  /**
   * Narrows to one category, in the query rather than afterwards.
   *
   * Filtering the returned 24 would have been a line of JavaScript and a lie:
   * within 50km of Arusha there are 105 hotels and 98 tour operators, but the
   * operators cluster in the town centre, so the nearest 24 of everything hold
   * 11 hotels. Filtering that set says '11 hotels near you'. Asking the
   * database says 105 and returns the nearest of them.
   */
  categoryId?: string,
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
    p_limit: NEAR_LIMIT,
    // Spread rather than passed as undefined: the generated signature types
    // p_category as a uuid, and omitting the key is how a SQL default is
    // actually requested.
    ...(categoryId ? { p_category: categoryId } : {}),
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

/**
 * How many listings of each category lie within the radius.
 *
 * This is the half that answers the actual complaint. Near-me has always
 * returned every category — measured from Arusha it returns safaris, car hire,
 * hotels, restaurants, activities and guides — but it returns them ordered by
 * distance, and in a town with 565 safari operators the nearest two dozen of
 * anything are safari operators. A reader sees a screen of tour companies and
 * concludes the tool only knows about tour companies.
 *
 * Counts shown before anything is filtered are what disprove that: 'Hotels
 * (105)' next to 'Safaris (98)' is the page saying what it has.
 */
export async function findNearbyCategories(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<Record<string, number>> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return {};
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return {};

  const radius = (RADII as readonly number[]).includes(radiusKm) ? radiusKm : 50;
  const supabase = createSearchClient();

  const { data, error } = await supabase.rpc('categories_near', {
    p_lat: Math.round(lat * 1e6) / 1e6,
    p_lng: Math.round(lng * 1e6) / 1e6,
    p_radius_km: radius,
  });

  if (error) return {};

  // Same narrowing as findNearby, and for the same reason: the type generator
  // emits `unknown` for a set-returning function, so the shape is asserted here
  // against what 058 declares rather than left as any.
  const rows = (data ?? []) as Array<{ category_id: string; n: number }>;
  return Object.fromEntries(rows.map((r) => [r.category_id, Number(r.n)]));
}
