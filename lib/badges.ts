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
