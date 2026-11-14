/**
 * The marketing budget added to every rate an operator publishes.
 *
 * Owner's call, 14 November 2026, taken from SafariBookings' partnership
 * agreement: rates submitted by an operator are shown to travellers with 10%
 * added. The operator keeps it when a trip sells at the shown price, and it is
 * framed as money to put back into Explore Tanzania advertising. An operator
 * may opt out, in which case their rates are shown exactly as entered.
 *
 * Applied in the query layer, where public rates are read, and nowhere else.
 * That way every surface a traveller sees — cards, the listing page, compare,
 * packages, services, deals and the Offer prices in structured data — carries
 * the same figure, and every surface an operator sees in the dashboard
 * carries the figure they typed. A page that formatted its own price could
 * show one without the other, and a traveller comparing two of our pages
 * would find two prices for the same trip.
 *
 * A constant rather than a database setting. Public pages are prerendered,
 * so a setting changed at runtime would reach them only when each one next
 * rebuilt — a price that differs by page until then. A change here ships with
 * a deploy and lands everywhere at once.
 */
export const RATE_MARKUP_PERCENT = 10;

/**
 * A published rate with the marketing budget added, rounded to whole units.
 *
 * Whole units because "$385" is a price and "$385.00" from a computed "$350 ×
 * 1.1" is arithmetic showing through; every rate on the site is already shown
 * without decimals. Rounded up, never down, so the operator never receives
 * less than the rate they set plus the full 10%.
 */
export function withMarkup(amount: number | string | null | undefined, optOut: boolean | null | undefined): number | null {
  if (amount === null || amount === undefined) return null;
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  if (optOut || RATE_MARKUP_PERCENT <= 0) return n;
  return Math.ceil(n * (1 + RATE_MARKUP_PERCENT / 100));
}
