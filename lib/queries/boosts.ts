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

export type LiveBoost = { businessId: string; priority: number; startsAt: string };

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

    // One business, several boosts: the strongest wins.
    const prev = best.get(row.business_id);
    if (!prev || row.priority < prev.priority) {
      best.set(row.business_id, {
        businessId: row.business_id,
        priority: row.priority,
        startsAt: row.starts_at,
      });
    }
  }

  return [...best.values()].sort(
    (a, b) => a.priority - b.priority || a.startsAt.localeCompare(b.startsAt),
  );
}

/** Orders cards as their boosts rank and marks them as featured. */
export function orderByBoost(cards: BusinessCard[], boosts: LiveBoost[]): BusinessCard[] {
  const position = new Map(boosts.map((b, i) => [b.businessId, i]));
  return cards
    .filter((c) => position.has(c.id))
    .sort((a, b) => position.get(a.id)! - position.get(b.id)!)
    .map((c) => ({ ...c, isFeatured: true }));
}
