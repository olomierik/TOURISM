'use client';

import { useEffect, useRef } from 'react';

/**
 * Fires one page-view beacon per mounted page.
 *
 * Mounted only on the four entity pages — destination, business, package, guide
 * — because `page_views` exists to answer "how many people saw my listing", and
 * a row with no entity attached cannot answer it. Whole-site traffic is a
 * question for the site analytics tool, not for the owner dashboard.
 *
 * sendBeacon is preferred over fetch: the browser hands it to the network stack
 * and lets the page unload, so a visitor who bounces immediately is still
 * counted. fetch with keepalive is the fallback for the handful of browsers
 * without it.
 */
export function PageView({
  locale,
  businessId,
  packageId,
  guideId,
  destinationId,
}: {
  locale: string;
  businessId?: string;
  packageId?: string;
  guideId?: string;
  destinationId?: string;
}) {
  // React 18+ mounts effects twice in development. Without this guard every
  // local page load records two views, which is the kind of quiet doubling that
  // survives all the way into a metrics deck.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const payload = JSON.stringify({
      // Read from the browser rather than threaded down as a prop: this is the
      // localized path the visitor actually has (/de/reiseziele/sansibar), which
      // is the thing worth grouping by, and it cannot drift from the route.
      path: window.location.pathname,
      locale,
      businessId,
      packageId,
      guideId,
      destinationId,
      // Read here rather than server-side: on the beacon request the Referer
      // header is this page, not the place the visitor actually came from.
      referrer: document.referrer || undefined,
    });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/views', new Blob([payload], { type: 'application/json' }));
        return;
      }
    } catch {
      // Some browsers throw on sendBeacon under strict privacy settings rather
      // than returning false. Fall through to fetch.
    }

    void fetch('/api/views', {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      // A failed count is not worth a console error in a visitor's browser.
    }).catch(() => {});
  }, [locale, businessId, packageId, guideId, destinationId]);

  return null;
}
