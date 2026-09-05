'use client';

import { useLinkStatus } from 'next/link';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

/**
 * Says that a click registered, for links that take a moment.
 *
 * The directory is server-rendered per request, so paging is a round trip.
 * Sampled every 150ms on the production build: the page held the old results,
 * the old page number and the old height for 1.2 seconds after the click, then
 * swapped the whole grid at once. Nothing moved in between — no spinner, no
 * dimming, not even a pressed state that outlasted the click.
 *
 * That dead second is what reads as "the page blinks". A reader who gets no
 * acknowledgement assumes the click missed and clicks again, and the second
 * click lands on a button that is about to be replaced.
 *
 * useLinkStatus reports the pending state of the enclosing Link, so the
 * indicator belongs to the control that was actually pressed rather than to
 * the page — press Next and Next is what responds.
 *
 * The spinner is decorative and the sr-only text carries the meaning, because
 * a spinning icon announces nothing. Under prefers-reduced-motion the site's
 * base stylesheet stops the animation, and a static icon appearing where there
 * was none is still the acknowledgement this exists to give.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  const t = useTranslations('common');

  if (!pending) return null;

  return (
    <>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span className="sr-only">{t('loading')}</span>
    </>
  );
}
