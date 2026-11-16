import type { BusinessCard } from '@/lib/queries/businesses';
import { createPublicClient } from '@/lib/supabase/public';
import { boostFitsCategory } from '@/lib/queries/boost-fit';

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
 *                page in the business's country
 *   directory    the top of every listing page in its country, not home
 *   destination  the top of listings filtered to one destination only
 *   category     the top of listings filtered to one category only
 */

export type BoostScope = 'homepage' | 'directory' | 'destination' | 'category';
export const BOOST_SCOPES: readonly BoostScope[] = ['homepage', 'directory', 'destination', 'category'];

/**
 * Placements that carry no destination or category limit. An operator who buys
 * one of these bought the whole directory, not one corner of it, so it is
 * pinned on every listing in its country (loadWideBoosts in businesses.ts).
 */
const UNSCOPED_PLACEMENTS = new Set(['homepage', 'directory', 'search']);

export type LiveBoost = {
  businessId: string;
  priority: number;
  startsAt: string;
  /**
   * The boost applies directory-wide rather than to one destination or
   * category, so it is pinned whatever the page filtered by.
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
 * The country a destination belongs to, for bounding the relaxation above.
 *
 * A featured operator is pinned across its own country, not the whole
 * directory: a Tanzanian operator reaches every Tanzanian destination and no
 * Kenyan one. Without this, a directory-wide boost would surface under Maasai
 * Mara for an operator who works out of Arusha.
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

/**
 * Which featured businesses belong on a page filtered to one category.
 *
 * The owner's rule (16 Nov 2026): a featured operator is seen on every tour
 * page, whatever activities or destinations it filled in. So on a tour page
 * (safaris, activities, guides) every featured tour business qualifies, and so
 * does one that named no category at all. On a hotel, car-hire or restaurant
 * page only businesses in that category do: a safari company pinned above the
 * hotels in Zanzibar is not what anyone searching for a hotel wants.
 */
export async function boostsFittingCategory(ids: string[], categoryId: string): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const supabase = createPublicClient();
  const [cats, held] = await Promise.all([
    supabase.from('categories').select('id, key'),
    supabase.from('business_categories').select('business_id, category_id').in('business_id', ids),
  ]);
  if (cats.error || held.error) {
    console.warn(`boostsFittingCategory error: ${cats.error?.message ?? ''} ${held.error?.message ?? ''}`.trim());
    return new Set();
  }
  const keyOf = new Map((cats.data ?? []).map((c) => [c.id, c.key]));
  const target = keyOf.get(categoryId);
  if (!target) return new Set();

  const byBusiness = new Map<string, string[]>();
  for (const r of held.data ?? []) {
    const key = keyOf.get(r.category_id);
    if (key) byBusiness.set(r.business_id, [...(byBusiness.get(r.business_id) ?? []), key]);
  }
  return new Set(ids.filter((id) => boostFitsCategory(byBusiness.get(id) ?? [], target)));
}

/** Orders cards as their boosts rank and marks them as featured. */
export function orderByBoost(cards: BusinessCard[], boosts: LiveBoost[]): BusinessCard[] {
  const position = new Map(boosts.map((b, i) => [b.businessId, i]));
  return cards
    .filter((c) => position.has(c.id))
    .sort((a, b) => position.get(a.id)! - position.get(b.id)!)
    .map((c) => ({ ...c, isFeatured: true }));
}
