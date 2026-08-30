'use client';

/**
 * The product event taxonomy.
 *
 * Named in the build prompt: search_started through subscription_started. These
 * are the events that describe whether the funnel works — where people enter,
 * where they stall, and which of them reaches an operator.
 *
 * Distinct from page_views, which counts arrivals. A page view says somebody
 * landed; these say what they did next, which is the question that decides
 * whether more traffic is worth buying.
 *
 * Sent with sendBeacon so a click that navigates away still records. fetch with
 * keepalive is the fallback, and both are wrapped: analytics must never be the
 * reason a button stops working. The whole function is a no-op on the server and
 * when the browser has neither transport.
 */

export type TrackEvent =
  | 'search_started'
  | 'search_result_clicked'
  | 'destination_viewed'
  | 'business_viewed'
  | 'whatsapp_clicked'
  | 'phone_clicked'
  | 'quote_started'
  | 'quote_submitted'
  | 'quote_response_received'
  | 'review_submitted'
  | 'trip_planner_started'
  | 'trip_planner_completed'
  | 'save_clicked'
  | 'signup_completed'
  | 'business_signup'
  | 'subscription_started';

/** Small, non-identifying context. Never an email, a name or a free-text message. */
export type TrackProps = Record<string, string | number | boolean | null | undefined>;

export function track(event: TrackEvent, props: TrackProps = {}): void {
  if (typeof window === 'undefined') return;

  const payload = JSON.stringify({
    event,
    props,
    path: window.location.pathname,
    ts: Date.now(),
  });

  try {
    if (navigator.sendBeacon) {
      // A Blob rather than a bare string, so the request carries a content type
      // the route can parse without sniffing.
      navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }));
      return;
    }
  } catch {
    // sendBeacon throws in a few sandboxed contexts. Fall through.
  }

  try {
    void fetch('/api/events', {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
  } catch {
    // Nothing to do and nothing to report. A dropped event is not worth a
    // console error on a page a traveller is trying to read.
  }
}
