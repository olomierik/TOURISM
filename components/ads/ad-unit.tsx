'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

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
 * …and gives that height back when no ad arrives. AdSense marks an unsold
 * impression by setting data-ad-status="unfilled" on the <ins>, and without
 * watching for it a reserved 280px box sits empty on every page the moment
 * fill drops — which is most pages, most of the time, on a new site, and all
 * of them until the site is approved. Collapsing is the difference between a
 * page with no ad on it and a page that looks broken.
 *
 * The loader script is in the layout (components/ads/adsense-script.tsx), once
 * per page, after the page is interactive.
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
  const t = useTranslations('ads');
  const boxRef = useRef<HTMLElement>(null);
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    const ins = insRef.current;

    // Collapsing is a DOM update, not application state: nothing React
    // renders depends on it, and routing it through useState would mean
    // setting state synchronously inside the effect that subscribes to the
    // thing. The <ins> is an external system AdSense writes to, and this
    // effect's whole job is to mirror one of its attributes onto the box.
    const show = (visible: boolean) => {
      const box = boxRef.current;
      if (box) box.style.display = visible ? '' : 'none';
    };

    // "filled" is the only state worth keeping the space for. Checking for
    // anything weaker does not work: AdSense sets data-adsbygoogle-status and
    // inserts a placeholder <div> as soon as it has *processed* the unit,
    // whether or not an ad is coming, so a unit that will never fill looks
    // identical to one still loading.
    const sync = () => {
      if (!ins) return;
      const status = ins.getAttribute('data-ad-status');
      if (status === 'filled') show(true);
      else if (status === 'unfilled') show(false);
    };

    let observer: MutationObserver | undefined;
    if (ins) {
      observer = new MutationObserver(sync);
      observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
      // The attribute can already be set by the time the observer attaches.
      sync();
    }

    // Only the push is once-per-unit. The watching above and the timer below
    // are set up on every mount, because React double-invokes effects in
    // development: guarding the whole effect on this ref meant the second
    // mount returned early, after the first mount's cleanup had already
    // disconnected the observer and cleared the timer — so in development
    // nothing watched the unit at all.
    if (!pushed.current) {
      pushed.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle ?? []).push({});
      } catch {
        // A blocked or failed ad must never take the article down with it.
        show(false);
      }
    }

    // Google does not always answer at all. An ad blocker, an offline script,
    // an unapproved site: the <ins> is processed and then nothing further
    // happens, data-ad-status never appears, and the reserved height becomes
    // a permanent 300px hole — the exact thing it exists to prevent. So the
    // space is given back unless an ad has actually arrived by now. The
    // observer stays attached, so a slow fill still gets its space.
    const giveUp = window.setTimeout(() => {
      if (ins?.getAttribute('data-ad-status') !== 'filled') show(false);
    }, 5000);

    return () => {
      observer?.disconnect();
      window.clearTimeout(giveUp);
    };
  }, []);

  return (
    <aside
      ref={boxRef}
      className={cn(
        // Reserved height prevents the layout shift described above.
        'my-10 flex min-h-[280px] flex-col items-center justify-center gap-1.5 overflow-hidden',
        className,
      )}
      data-ad-surface={surface}
    >
      {/* Visible, not just announced. AdSense requires an ad to be
          distinguishable from the content around it, and on a directory the
          risk is specific: an ad for a safari company, inside a page listing
          safari companies, is indistinguishable from a listing unless it says
          so. */}
      <p className="text-overline w-full font-semibold uppercase text-muted-foreground">
        {t('label')}
      </p>
      <ins
        ref={insRef}
        className="adsbygoogle block w-full"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
