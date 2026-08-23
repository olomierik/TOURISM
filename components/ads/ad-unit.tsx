'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

import { cn } from '@/lib/utils';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * A single AdSense unit.
 *
 * Reserves its height before the ad loads. An ad that appears and pushes the
 * article down is a Cumulative Layout Shift penalty, and CLS feeds Core Web
 * Vitals, which feed ranking — so an ad placed carelessly can cost more search
 * traffic than it earns in revenue.
 *
 * The loader script uses `afterInteractive`, so it never competes with the
 * article itself for the initial paint.
 */
export function AdUnit({
  clientId,
  slotId,
  surface,
  className,
}: {
  clientId: string;
  slotId: string;
  surface: string;
  className?: string;
}) {
  const pushed = useRef(false);

  useEffect(() => {
    // React 18+ double-invokes effects in development; pushing twice makes
    // AdSense log "already have ads in them" and blank the unit.
    if (pushed.current) return;
    pushed.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // A blocked or failed ad must never take the article down with it.
    }
  }, []);

  return (
    <>
      <Script
        id="adsbygoogle-init"
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      />

      <aside
        className={cn(
          // Reserved height prevents the layout shift described above.
          'my-10 flex min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/30',
          className,
        )}
        // Labelled for readers and for screen readers. Required by AdSense
        // policy in spirit and simply honest in practice.
        aria-label="Advertisement"
        data-ad-surface={surface}
      >
        <ins
          className="adsbygoogle block w-full"
          style={{ display: 'block' }}
          data-ad-client={clientId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </aside>
    </>
  );
}
