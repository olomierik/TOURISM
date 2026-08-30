'use client';

import { useEffect, useRef } from 'react';

import { track, type TrackEvent, type TrackProps } from '@/lib/analytics/track';

/**
 * Two small clients so server components can record product events.
 *
 * The pages that matter — business profiles, destinations — are server
 * components and must stay that way: they are prerendered and they carry the
 * SEO. So the tracking is confined to these leaves rather than pulling a whole
 * page across the boundary for the sake of an onClick.
 */

/**
 * Fires once when the component mounts.
 *
 * A ref guard rather than an empty dependency array alone, because React runs
 * effects twice in development and a doubled business_viewed would make every
 * local number wrong in a way that looks like real traffic.
 */
export function TrackView({ event, props }: { event: TrackEvent; props?: TrackProps }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event, props);
    // props is a fresh object each render; the ref is what actually guards this,
    // so re-running on identity changes would defeat the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  return null;
}

/**
 * An external link that records the click.
 *
 * Records before navigating and does not await: sendBeacon is fire-and-forget
 * by design, and a tap that waits on analytics before opening WhatsApp is a tap
 * that feels broken on a slow connection.
 */
export function TrackedLink({
  event,
  props,
  href,
  children,
  ...rest
}: {
  event: TrackEvent;
  props?: TrackProps;
  href: string;
  children: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <a href={href} onClick={() => track(event, props)} {...rest}>
      {children}
    </a>
  );
}
