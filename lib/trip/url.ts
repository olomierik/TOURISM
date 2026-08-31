// Relative, not '@/lib/trip/cost'. The verification suites are plain .mjs run
// by node, which does not know the tsconfig alias — a sibling import through
// '@/' makes this module unloadable by its own tests.
import { isStyle, type Style } from './cost.ts';

/**
 * A trip, encoded into a query string.
 *
 * Two things this buys, and the second is the reason it exists:
 *
 * A built trip becomes a link. Somebody planning a honeymoon with a partner in
 * another city has, until now, no way to show them the estimate except a
 * screenshot — and a screenshot cannot be edited into "what if we drop a night
 * in Arusha". The state was trapped in a component.
 *
 * And a destination page can hand the calculator a starting point. "Add this to
 * a whole-trip estimate" pointing at an empty form asks the reader to find the
 * park they were just reading about in a dropdown of 36; pointing at
 * ?stops=serengeti:3 opens with it already there.
 *
 * Slugs rather than ids, because a URL somebody pastes into a message should
 * survive being read by a human, and because ids would leak database keys into
 * a share link for no benefit. Everything here is parsed defensively: a query
 * string is user input, and a hand-edited one must degrade to an empty form
 * rather than to a crash or a nonsense estimate.
 */

export type TripParams = {
  stops: Array<{ slug: string; nights: number }>;
  style: Style;
  travellers: number;
};

export const DEFAULT_NIGHTS = 3;
export const MAX_NIGHTS = 60;
export const MAX_TRAVELLERS = 20;
export const MAX_STOPS = 12;

/**
 * `serengeti:3,ngorongoro:2` → stops.
 *
 * Anything malformed is dropped rather than defaulted. A stop with an
 * unparseable night count is more likely a truncated link than an intent to
 * spend three nights there, and silently inventing nights would put a number in
 * front of a reader that nobody chose.
 */
export function parseTrip(params: URLSearchParams): TripParams {
  const raw = params.get('stops') ?? '';

  const seen = new Set<string>();
  const stops: TripParams['stops'] = [];

  for (const part of raw.split(',')) {
    if (stops.length >= MAX_STOPS) break;

    const [slug, nightsRaw] = part.split(':');
    // Slugs here are matched against the database anyway, but bounding the
    // shape keeps a pathological query string from reaching that far.
    if (!slug || !/^[a-z0-9-]{1,80}$/.test(slug)) continue;
    if (seen.has(slug)) continue;

    const nights = Number.parseInt(nightsRaw ?? '', 10);
    if (!Number.isFinite(nights) || nights < 1 || nights > MAX_NIGHTS) continue;

    seen.add(slug);
    stops.push({ slug, nights });
  }

  const styleRaw = params.get('style') ?? '';
  const style: Style = isStyle(styleRaw) ? styleRaw : 'midrange';

  const peopleRaw = Number.parseInt(params.get('people') ?? '', 10);
  const travellers =
    Number.isFinite(peopleRaw) && peopleRaw >= 1 && peopleRaw <= MAX_TRAVELLERS
      ? peopleRaw
      : 2;

  return { stops, style, travellers };
}

/**
 * The inverse. Produces a query string with no leading `?`, empty when the trip
 * is empty — an empty trip should leave a clean URL rather than
 * `?stops=&style=midrange&people=2`, which looks like state where there is none.
 */
export function serializeTrip(trip: TripParams): string {
  if (trip.stops.length === 0) return '';

  const params = new URLSearchParams();
  params.set('stops', trip.stops.map((s) => `${s.slug}:${s.nights}`).join(','));
  params.set('style', trip.style);
  params.set('people', String(trip.travellers));
  return params.toString();
}
