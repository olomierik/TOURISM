/**
 * The badges a card can earn, as Viator's "Badge of Excellence" works: given by
 * the numbers, never sold. Featured placement is the paid one, and it says so.
 */

/** Rated this well by at least this many travellers. */
export const TOP_RATED = { minAvg: 4.7, minCount: 10 } as const;

export function isTopRated(avg: number | undefined, count: number | undefined): boolean {
  return (count ?? 0) >= TOP_RATED.minCount && (avg ?? 0) >= TOP_RATED.minAvg;
}

/** Typical reply time in whole hours, at least one; null when unknown. */
export function replyHours(minutes: number | null | undefined): number | null {
  if (minutes === null || minutes === undefined) return null;
  return Math.max(1, Math.round(minutes / 60));
}

/**
 * design.md §6.4 display thresholds.
 *
 * A number shown below its threshold is worse than no number: "4.0 (1)" reads
 * as a rating when it is one person's opinion, and "Response rate 0%" reads as
 * a failure when it means nobody has asked yet. The audit found that second one
 * on live business pages.
 */
export const SHOW_RATING_MIN_COUNT = 3;
export const SHOW_RESPONSE_MIN_ENQUIRIES = 5;

/** Stars, average and count — only above the threshold (§6.4). */
export function showsRating(count: number | null | undefined): boolean {
  return (count ?? 0) >= SHOW_RATING_MIN_COUNT;
}

/**
 * Response rate and typical reply time — only once enough people have asked.
 *
 * Note for whoever wires this up: `response_rate` and `avg_response_minutes`
 * are columns on `businesses`, but the enquiry COUNT is not, so the caller has
 * to pass it. Deriving "enough enquiries" from a non-null response_rate would
 * be wrong in exactly the case that matters — a listing with one enquiry and
 * no reply has a perfectly real 0%.
 */
export function showsResponse(enquiryCount: number | null | undefined): boolean {
  return (enquiryCount ?? 0) >= SHOW_RESPONSE_MIN_ENQUIRIES;
}
