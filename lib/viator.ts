/**
 * Viator affiliate links (Viator Partner Program).
 *
 * Enquiries to operators listed here stay the main path; these links cover
 * what they don't sell (day trips, transfers, tickets). Viator pays a
 * commission on bookings made within 30 days of a click, once the experience
 * has taken place.
 *
 * Off until NEXT_PUBLIC_VIATOR_PID is set to the partner ID from the Viator
 * Partner dashboard (it looks like P00012345). NEXT_PUBLIC_VIATOR_MCID is the
 * campaign value from the same dashboard; 42383 is Viator's default for
 * affiliate links.
 */

const pid = (process.env.NEXT_PUBLIC_VIATOR_PID ?? '').trim();
const mcid = (process.env.NEXT_PUBLIC_VIATOR_MCID ?? '').trim() || '42383';

export const viatorEnabled = /^P\d{5,}$/.test(pid);

/** A Viator search for `query`, carrying the partner ID. */
export function viatorSearchUrl(query: string): string {
  const url = new URL('https://www.viator.com/searchResults/all');
  url.searchParams.set('text', query);
  url.searchParams.set('pid', pid);
  url.searchParams.set('mcid', mcid);
  url.searchParams.set('medium', 'link');
  return url.toString();
}
