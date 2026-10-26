/**
 * Whether subscriptions are on sale.
 *
 * **Off.** Erick's call, 2026-10: tiers come back when the site has enough
 * traffic to sell them honestly. Until then there is nothing to buy, and a
 * directory that still ranks by `subscription_tier`, badges a "Featured" plan
 * and offers an upgrade page is advertising a product that does not exist.
 *
 * A flag rather than a deletion, deliberately. The billing code is real work —
 * plans, bank transfer, trials, reminders, the admin queue — and it is
 * correct; it is only early. Deleting it means writing it again. Everything
 * behind this flag stays compiled, tested and one line from returning.
 *
 * What the flag does **not** touch, and why:
 *
 *   - `businesses.tier` stays in the database. Dropping a column is a
 *     migration that cannot be undone, and the three listings not on `free`
 *     are a record of something that happened.
 *   - Ordering no longer reads it at all (see `searchBusinesses`). That is not
 *     flagged, because the replacement — §7.2's Recommended rule — is the
 *     better ranking on its own merits and should stay when billing returns.
 *   - §6.4 already gives Featured no badge. That is a design rule about what a
 *     trust mark may mean, not a billing state, so it is not flagged either.
 *
 * When subscriptions return, flipping this re-exposes the dashboard's
 * subscription page, the plan badge and the paid-feature gates. It does not
 * re-add paid placement, and it should not.
 */
export const SUBSCRIPTIONS_ENABLED = false;

/**
 * Whether a paid-only feature should be withheld.
 *
 * While subscriptions are off, nobody is on a paid plan and nobody can get on
 * one, so gating features by plan would lock every operator out of deals and
 * packages for a reason they cannot act on. With the flag off, everything is
 * unlocked — which is also the right pitch for the outreach campaign currently
 * telling operators the listing "is free, and it stays free".
 */
export function isPaidFeatureLocked(tier: string | null | undefined): boolean {
  if (!SUBSCRIPTIONS_ENABLED) return false;
  return (tier ?? 'free') === 'free';
}
