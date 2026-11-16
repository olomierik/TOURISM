/**
 * The category rule for featured operators, kept free of imports so it can be
 * tested on its own (tests/boost-fit.test.mjs). See boostsFittingCategory.
 */

/** The kinds of business a traveller looking for a trip is looking for. */
export const TOUR_CATEGORY_KEYS = new Set(['safaris', 'activities', 'tour-guides']);

/**
 * Whether a featured business belongs on a page filtered to `targetKey`.
 * `ownKeys` are the category keys on the business's own profile.
 */
export function boostFitsCategory(ownKeys: readonly string[], targetKey: string): boolean {
  if (ownKeys.includes(targetKey)) return true;
  if (!TOUR_CATEGORY_KEYS.has(targetKey)) return false;
  return ownKeys.length === 0 || ownKeys.some((k) => TOUR_CATEGORY_KEYS.has(k));
}
