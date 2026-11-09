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
  // A traveller followed an operator's own checkout link. Browser-sent like the
  // rest, and it was missing here while track.ts has had it since 054 — so
  // every one of these clicks was typed, sent, and thrown away by /api/events
  // with nothing in a log to say so. The only number that says whether the
  // payment rail is used at all.
  'payment_started',
] as const;

/**
 * Enum values this endpoint will never accept, and why that is not an omission.
 *
 * `whatsapp_uncounted` is written by app/api/whatsapp/[id]/route.ts with the
 * admin client, about a click it has just declined to count. A browser that
 * could post it could forge the evidence that 073 is working. The assertion in
 * scripts/verify-analytics.mjs reads this list, so adding an enum value without
 * a decision here still fails.
 */
export const SERVER_ONLY_EVENTS = ['whatsapp_uncounted'] as const;

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
 * The locales, copied rather than imported.
 *
 * i18n/routing.ts pulls in next-intl, which makes this module unimportable from
 * the assertion suite — and a sanitiser that can only be tested by standing up a
 * server is one that stops being tested. Nine strings that rarely change in
 * the life of the project is a cheaper dependency than that, and the suite
 * asserts the two lists still agree.
 *
 * Keep this in the same order as the tuple there; scripts/verify-analytics.mjs
 * reads that tuple and fails if the two sets diverge. A locale missing from
 * here is not a cosmetic bug: `localeOf` returns null for it, so every page
 * view from that language is recorded as belonging to no locale, and the
 * per-locale conversion numbers the whole strategy rests on go quietly wrong.
 */
export const LOCALES: readonly string[] = ['en', 'de', 'fr', 'it', 'sw', 'zh', 'ar', 'ru', 'hi'];

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
