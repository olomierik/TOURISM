/**
 * Whether subscriptions are on sale.
 *
 * **On.** Erick's call, 9 November 2026, reversing his own of 2026-10.
 *
 * The October reasoning was that there was nothing to buy: no prices the owner
 * had agreed to, no checkout that worked, and an upgrade page advertising a
 * product that did not exist. All three of those have since changed. 080 wrote
 * the prices he set — Premium $120/year, Featured $200/year — the Paddle and
 * Flutterwave credentials are in the environment, so `activeProvider()` can
 * return a provider rather than null, and an approved claim now starts a
 * 60-day Premium trial on its own, so an operator meets the paid features by
 * using them rather than by being asked to pay first.
 *
 * It also fixes something that was quietly broken rather than merely early.
 * `deals_guard`, the trigger, has always refused a deal unless the active
 * subscription's plan is a paying tier, and it was never relaxed to match this
 * flag. So with the flag off the dashboard showed the deal form to all 28
 * operators who could reach it, and the database raised "deals require a paid
 * plan" when they submitted it. Turning this on makes the page say what the
 * database has been saying all along, and gives them a way to act on it.
 *
 * Who this changes things for, counted on the day: 29 listings have an owner.
 * One is on `featured`. Of the other 28, 23 hold an active subscription on the
 * **free** plan and 5 hold none, so `deals_guard` declines all 28 either way.
 * None of them loses anything they had; 28 of them stop being shown a form
 * that fails.
 *
 * It does not break the outreach promise. `lib/outreach/message.ts` tells an
 * operator that claiming is free and that they can "correct anything we got
 * wrong, add photographs and set which destinations you cover. It is free, and
 * it stays free." None of those three is tier-gated — `isPaidFeatureLocked` is
 * read on the deals page and nowhere else — so the listing and everything that
 * sentence names remain free.
 *
 * A flag rather than a deletion, deliberately, and it stays one: this went off
 * once and may again.
 *
 * What the flag does **not** touch, and why:
 *
 *   - `businesses.tier` stays in the database, and nothing reads it for this.
 *     The gates and the dashboard both take the tier from the active
 *     subscription's plan, which is what `deals_guard` uses; the column is a
 *     record of something that happened and is now 3,851 `free` to 1
 *     `featured`, which is not the live answer for 23 of them.
 *   - Ordering still does not read it (see `searchBusinesses`). §7.2's
 *     Recommended rule replaced it on its own merits and keeps the surface
 *     honest now that money is involved again.
 *   - §6.4 still gives Featured no badge. A trust mark may not be bought, and
 *     turning billing back on is exactly when that rule earns its keep.
 */
export const SUBSCRIPTIONS_ENABLED = true;

/**
 * Whether a paid-only feature should be withheld.
 *
 * `tier` must be the tier of the **active subscription's plan**, not
 * `businesses.tier`. The two disagree for 23 of the 29 owned listings, and
 * `deals_guard` reads the former, so passing the column would withhold a
 * feature the database would then allow — or offer one it refuses.
 *
 * While the flag was off this returned false for everyone, on the reasoning
 * that gating by plan when no plan is for sale locks an operator out for a
 * reason they cannot act on. That reasoning was sound and is now spent: there
 * is a price, a checkout, and a 60-day trial that starts itself when a claim
 * is approved.
 */
export function isPaidFeatureLocked(tier: string | null | undefined): boolean {
  if (!SUBSCRIPTIONS_ENABLED) return false;
  return (tier ?? 'free') === 'free';
}
