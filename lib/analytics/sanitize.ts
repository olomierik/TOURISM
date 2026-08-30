/**
 * Bounds on what a browser may write into the events table.
 *
 * Lives here rather than inside the route so it can be asserted directly. The
 * route is the only caller, but a validator that can only be tested by standing
 * up a server is a validator that stops being tested.
 *
 * Everything here treats the payload as hostile. /api/events is an unauthenticated
 * write endpoint reachable by anyone who can open the site; without limits it is
 * a free store-anything service with our name on the bill.
 */

/** The enum in migration 031. Kept in step by an assertion, not by discipline. */
export const TRACK_EVENTS = [
  'search_started',
  'search_result_clicked',
  'destination_viewed',
  'business_viewed',
  'whatsapp_clicked',
  'phone_clicked',
  'quote_started',
  'quote_submitted',
  'quote_response_received',
  'review_submitted',
  'trip_planner_started',
  'trip_planner_completed',
  'save_clicked',
  'signup_completed',
  'business_signup',
  'subscription_started',
] as const;

const EVENT_SET: ReadonlySet<string> = new Set(TRACK_EVENTS);

export function isTrackEvent(value: unknown): value is (typeof TRACK_EVENTS)[number] {
  return typeof value === 'string' && EVENT_SET.has(value);
}

/**
 * Twelve keys, 120 characters, primitives only.
 *
 * Silently drops what does not fit rather than rejecting the event: a slightly
 * over-long slug should cost one property, not the whole record of a click that
 * really happened.
 */
export function safeProps(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string | number | boolean> = {};

  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (Object.keys(out).length >= 12) break;
    if (!/^[a-z_][a-z0-9_]{0,31}$/i.test(key)) continue;
    if (raw === null || raw === undefined) continue;

    if (typeof raw === 'string') {
      if (raw.length > 120) continue;
      out[key] = raw;
    } else if (typeof raw === 'number' && Number.isFinite(raw)) {
      out[key] = raw;
    } else if (typeof raw === 'boolean') {
      out[key] = raw;
    }
  }
  return out;
}

/**
 * The four locales, copied rather than imported.
 *
 * i18n/routing.ts pulls in next-intl, which makes this module unimportable from
 * the assertion suite — and a sanitiser that can only be tested by standing up a
 * server is one that stops being tested. Four strings that have not changed in
 * the life of the project is a cheaper dependency than that, and the suite
 * asserts the two lists still agree.
 */
export const LOCALES: readonly string[] = ['en', 'de', 'fr', 'it'];

/**
 * The locale a path belongs to.
 *
 * The point of recording it: the whole strategy rests on German converting
 * better than English, and that is unanswerable unless every event carries a
 * language. An unprefixed path is English, because that is what
 * localePrefix: 'as-needed' means.
 */
export function localeFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const first = path.split('/').filter(Boolean)[0];
  return LOCALES.includes(first) ? first : 'en';
}

/** A path we are willing to store: ours, and short enough to be a real route. */
export function safePath(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('/') && value.length <= 512
    ? value
    : null;
}
