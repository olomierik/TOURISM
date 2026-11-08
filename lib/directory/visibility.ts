import { cache } from 'react';

import { createPublicClient } from '@/lib/supabase/public';

/**
 * Which listings the directory shows before the visitor asks for more.
 *
 * - `claimed`     — somebody owns it, or an admin has checked its licence.
 * - `substantial` — anything that is not an import stub. Because `is_stub` is
 *                   cleared the moment a person edits a listing, and because
 *                   the rule below also lets ownership through, this is a
 *                   superset of `claimed`.
 * - `all`         — every approved listing.
 */
export type DirectoryTier = 'claimed' | 'substantial' | 'all';

export const DIRECTORY_TIERS: DirectoryTier[] = ['claimed', 'substantial', 'all'];

export const isDirectoryTier = (v: unknown): v is DirectoryTier =>
  typeof v === 'string' && (DIRECTORY_TIERS as string[]).includes(v);

/**
 * Below this many results, the tier filter is abandoned for that view.
 *
 * Measured on 8 Nov 2026. The whole directory holds 426 listings under the
 * default rule, which is a directory. Individual categories do not:
 *
 *   safaris 404 · car-rental 11 · hotels 6 · activities 3 · restaurants 1 · tour-guides 1
 *
 * So a rule applied flatly turns Restaurants into a page with one row on it,
 * which reads as a broken directory rather than a careful one — worse than the
 * problem it was meant to fix. A page that cannot be filled honestly is filled
 * completely, and says so.
 *
 * One page of results, so the visitor never meets a filtered view they could
 * have scrolled past in a second.
 */
export const MIN_TIER_RESULTS = 12;

const DEFAULT_TIER: DirectoryTier = 'substantial';

/**
 * The configured default, from `platform_settings.directory_default_tier`.
 *
 * A dial rather than a constant because the right answer moves as claims
 * arrive: 31 listings are claimed today, and the day that passes ~300 this
 * should become `claimed` without a deploy. Cached per request; a directory
 * page reads it once however many queries it runs.
 *
 * Any failure returns the default rather than throwing. Not being able to read
 * a preference is not a reason to fail a page, and the safe direction is the
 * one that still shows the visitor a usable directory.
 */
export const getDirectoryDefaultTier = cache(async (): Promise<DirectoryTier> => {
  try {
    const { data, error } = await createPublicClient()
      .from('platform_settings')
      .select('value')
      .eq('key', 'directory_default_tier')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return isDirectoryTier(data?.value) ? data.value : DEFAULT_TIER;
  } catch (err) {
    console.warn('getDirectoryDefaultTier:', err);
    return DEFAULT_TIER;
  }
});
