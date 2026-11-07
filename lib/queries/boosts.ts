import type { BusinessCard } from '@/lib/queries/businesses';
import { createPublicClient } from '@/lib/supabase/public';

/**
 * Enhanced visibility: the listings an admin has boosted to page one.
 *
 * A boost is a `featured_listings` row (migration 008). It was designed for
 * exactly this — time-boxed, scoped to a placement, written only by admins —
 * and sat unused because nothing on the public side ever read it. It is read
 * through the public client on purpose: the `featured_read` policy returns a
 * row only while it is active and inside its window, so an expired boost
 * leaves the directory without anybody having to remember to switch it off.
 *
 * Scopes, as the admin panel offers them:
 *
 *   homepage     the home page Featured row, and the top of every listing
 *                page the business would appear on anyway
 *   directory    the top of every listing page it would appear on, not home
 *   destination  the top of listings filtered to one destination only
 *   category     the top of listings filtered to one category only
 */

export type BoostScope = 'homepage' | 'directory' | 'destination' | 'category';
export const BOOST_SCOPES: readonly BoostScope[] = ['homepage', 'directory', 'destination', 'category'];

/**
 * Placements that carry no destination or category limit. An operator who buys
 * one of these bought the whole directory, not one corner of it, which is what
 * makes the taxonomy relaxation in `searchBusinesses` legitimate: we are not
 * widening a boost past what was sold, we are honouring what was sold.
 */
const UNSCOPED_PLACEMENTS = new Set(['homepage', 'directory', 'search']);

export type LiveBoost = {
  businessId: string;
  priority: number;
  startsAt: string;
  /**
   * The boost applies directory-wide rather than to one destination or
   * category. Only an unscoped boost can appear in a search whose taxonomy the
   * operator never opted into — see `relaxTaxonomyFor`.
   */
  unscoped: boolean;
};

/**
 * Pinned rows per page. Enough to sell, few enough that page one is still
 * mostly the directory a traveller came for — a first screen that is all
 * placement reads as an advert, and stops being trusted as a directory.
 */
export const MAX_BOOSTED_PER_PAGE = 4;

/** Home shows at most this many in its Featured row. */
export const MAX_HOMEPAGE_BOOSTS = 6;

export async function getLiveBoosts(context: {
  /** Home page row: only `homepage` boosts. */
  homepage?: boolean;
  destinationId?: string;
  categoryId?: string;
}): Promise<LiveBoost[]> {
  const { data, error } = await createPublicClient()
    .from('featured_listings')
    .select('business_id, placement, destination_id, category_id, priority, starts_at, ends_at, is_active');

  if (error) {
    console.warn(`getLiveBoosts error: ${error.message}`);
    return [];
  }

  const now = Date.now();
  const best = new Map<string, LiveBoost>();

  for (const row of data ?? []) {
    // RLS already restricts to live rows; checked again because the response
    // is cached for minutes and a window can close inside that.
    if (!row.is_active) continue;
    if (Date.parse(row.starts_at) > now) continue;
    if (row.ends_at && Date.parse(row.ends_at) <= now) continue;

    const applies = context.homepage
      ? row.placement === 'homepage'
      : row.placement === 'homepage' ||
        row.placement === 'directory' ||
        row.placement === 'search' ||
        (row.placement === 'destination' &&
          Boolean(context.destinationId) &&
          row.destination_id === context.destinationId) ||
        (row.placement === 'category' &&
          Boolean(context.categoryId) &&
          row.category_id === context.categoryId);
    if (!applies) continue;

    // One business, several boosts: the strongest wins on position, but the
    // widest wins on reach. An operator holding a Serengeti boost and a
    // directory-wide one has bought both, so the pair must not cancel out to
    // the narrower of the two just because the narrower one sorts higher.
    const unscoped = UNSCOPED_PLACEMENTS.has(row.placement);
    const prev = best.get(row.business_id);
    if (!prev) {
      best.set(row.business_id, {
        businessId: row.business_id,
        priority: row.priority,
        startsAt: row.starts_at,
        unscoped,
      });
    } else {
      if (row.priority < prev.priority) {
        prev.priority = row.priority;
        prev.startsAt = row.starts_at;
      }
      prev.unscoped = prev.unscoped || unscoped;
    }
  }

  return [...best.values()].sort(
    (a, b) => a.priority - b.priority || a.startsAt.localeCompare(b.startsAt),
  );
}

/**
 * Which boosted businesses may ignore a destination or category filter.
 *
 * The rule, and the reason for it: a filter excludes a listing that did not
 * opt into that taxonomy, and an operator who set *no* destinations has not
 * declined the Serengeti — they have said nothing at all. Treating silence as
 * "serves nowhere" is what made a directory-wide boost invisible on every
 * destination and category page, which is the opposite of what was sold.
 *
 * So silence is relaxed and a stated answer is respected. An operator who
 * listed Serengeti and Ngorongoro is taken at their word and does not surface
 * under Zanzibar; one who listed nothing surfaces everywhere their boost
 * reaches. A scoped boost never relaxes anything — it was sold for one corner
 * of the directory.
 *
 * Returns the gap per axis. The caller decides what to do with it:
 * `searchBusinesses` relaxes both axes for any business with a gap on either,
 * because a profile that has not said where it works has not said what it does
 * either. An empty set means every boosted business stated its coverage, and
 * the ordinary filtered query already has it.
 */
export async function relaxTaxonomyFor(
  boosts: LiveBoost[],
): Promise<{ destinations: Set<string>; categories: Set<string> }> {
  const empty = { destinations: new Set<string>(), categories: new Set<string>() };
  const ids = boosts.filter((b) => b.unscoped).map((b) => b.businessId);
  if (!ids.length) return empty;

  const supabase = createPublicClient();
  const [dest, cat] = await Promise.all([
    supabase.from('business_destinations').select('business_id').in('business_id', ids),
    supabase.from('business_categories').select('business_id').in('business_id', ids),
  ]);

  if (dest.error || cat.error) {
    // Relaxing nothing is the safe failure: the boost still runs wherever the
    // operator's own taxonomy puts it, exactly as it did before this existed.
    console.warn(
      `relaxTaxonomyFor error: ${dest.error?.message ?? ''} ${cat.error?.message ?? ''}`.trim(),
    );
    return empty;
  }

  const hasDestination = new Set((dest.data ?? []).map((r) => r.business_id));
  const hasCategory = new Set((cat.data ?? []).map((r) => r.business_id));

  return {
    destinations: new Set(ids.filter((id) => !hasDestination.has(id))),
    categories: new Set(ids.filter((id) => !hasCategory.has(id))),
  };
}

/**
 * The country a destination belongs to, for bounding the relaxation above.
 *
 * An operator who named no destinations defaults to serving their own country,
 * not the whole directory: a Tanzanian operator reaches every Tanzanian
 * destination and no Kenyan one. Without this, a directory-wide boost would
 * surface under Maasai Mara for an operator who works out of Arusha, which is
 * placement the traveller cannot use and the operator cannot service.
 */
export async function getDestinationCountry(destinationId: string): Promise<string | null> {
  const { data, error } = await createPublicClient()
    .from('destinations')
    .select('country_code')
    .eq('id', destinationId)
    .maybeSingle();

  if (error) {
    console.warn(`getDestinationCountry error: ${error.message}`);
    return null;
  }
  return data?.country_code ?? null;
}

/** Orders cards as their boosts rank and marks them as featured. */
export function orderByBoost(cards: BusinessCard[], boosts: LiveBoost[]): BusinessCard[] {
  const position = new Map(boosts.map((b, i) => [b.businessId, i]));
  return cards
    .filter((c) => position.has(c.id))
    .sort((a, b) => position.get(a.id)! - position.get(b.id)!)
    .map((c) => ({ ...c, isFeatured: true }));
}
