import type { BusinessCard } from '@/lib/queries/businesses';

/**
 * §9.2 — who may appear on Home "Featured", "Similar operators", and the top
 * of the Recommended sort.
 *
 * All of these must hold:
 *   - Country = Tanzania (unless the viewer enabled other countries)
 *   - Category is a traveller category
 *   - Tier ≥ Claimed; for Home Featured, tier = Licence checked
 *   - ≥ 3 real photos passing §5.2
 *   - ≥ 3 reviews averaging ≥ 4.0, for Home Featured only
 *
 * **Measured against this database, nothing clears the Home Featured bar.**
 * There are 11 licence numbers, 2 verified listings and 1 review in the entire
 * table, and of 4,480 business photo rows 96% are hotlinked Google Places URLs
 * of which 29 of 30 sampled return 403. §7.1.7 anticipates exactly this — "If
 * fewer than 3 qualify, hide the section" — so the homepage drops the block
 * rather than filling it with listings that do not meet the promise the block
 * makes. That is the intended behaviour of an honest gate on thin data, not a
 * bug, and the fix is the §5.2 photo ingestion plus licence checks, both of
 * which are product work rather than design work.
 *
 * `similar` and `recommended` use the lower bar the spec sets for them, so
 * those surfaces keep working while Featured waits for data.
 */

/** §9.2: "a traveller category (Safaris, Stays, Transfers, Activities, Guides, Food)." */
export const TRAVELLER_CATEGORY_KEYS = new Set([
  'safaris',
  'hotels',
  'car-rental',
  'activities',
  'tour-guides',
  'restaurants',
]);

/** §9.2 photo floor, and §5.1.4 repeats it for homepage surfaces. */
export const MIN_REAL_PHOTOS = 3;
/** §9.2 review floor for Home Featured. */
export const MIN_REVIEWS = 3;
export const MIN_RATING = 4.0;

export type CurationSurface = 'featured' | 'similar' | 'recommended';

export function meetsCuration(
  b: BusinessCard,
  surface: CurationSurface,
  opts: { includeOtherCountries?: boolean } = {},
): boolean {
  // Country — §9.3 defaults every listing surface to Tanzania.
  if (!opts.includeOtherCountries && (b.countryCode ?? '').toUpperCase() !== 'TZ') return false;

  // Traveller category. A listing with no category recorded cannot be shown to
  // travellers on a curated surface: PRIME AUDITORS is filed under Safaris and
  // describes itself as an accounting firm, and a missing category is how that
  // kind of row gets through (§9.4).
  if (!b.categorySlug || !TRAVELLER_CATEGORY_KEYS.has(b.categorySlug)) return false;

  // Tier. Claimed for similar/recommended, licence-checked for Featured.
  if (surface === 'featured') {
    if (!b.isVerified) return false;
  } else if (!b.isClaimed && !b.isVerified) {
    return false;
  }

  // Photos. `photoCount` counts rows in `media`, which is the best signal the
  // row carries — it cannot tell a live URL from a dead one, so this is a
  // ceiling on quality rather than a guarantee of it.
  if (b.photoCount < MIN_REAL_PHOTOS) return false;

  if (surface === 'featured') {
    if (b.ratingCount < MIN_REVIEWS) return false;
    if (b.ratingAvg < MIN_RATING) return false;
  }

  return true;
}

/**
 * §7.2: "Recommended = licence-checked + claimed + ≥3 photos first, then by
 * review count."
 *
 * A sort, not a filter — the directory still shows everything, it just leads
 * with the listings a traveller can act on. Returns a copy.
 */
export function sortRecommended(items: BusinessCard[]): BusinessCard[] {
  const score = (b: BusinessCard) =>
    (b.isVerified ? 4 : 0) + (b.isClaimed ? 2 : 0) + (b.photoCount >= MIN_REAL_PHOTOS ? 1 : 0);
  return [...items].sort((a, b) => score(b) - score(a) || b.ratingCount - a.ratingCount);
}
