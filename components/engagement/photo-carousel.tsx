'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react';

import { cn } from '@/lib/utils';

export type CarouselPhoto = {
  url: string;
  alt: string;
  /** Set for photographs a traveller uploaded, so they can be credited. */
  credit?: string | null;
};

/**
 * Rotates through every photograph a listing has.
 *
 * "Regardless there is a cover photo" was the requirement, and it is the right
 * one: the cover is simply the first frame. A gallery that hides behind a
 * single still is a gallery nobody sees, and these listings now carry an
 * average of three images each that until now only appeared on the detail page.
 *
 * Three things it has to get right.
 *
 * It must not move while somebody is reading. Rotation stops on hover, on
 * focus, when the tab is hidden, and permanently the moment a reader presses an
 * arrow — at that point they are steering, and a carousel that wrestles back is
 * the most disliked pattern on the web.
 *
 * It must be operable without a mouse. The arrows are real buttons in the tab
 * order, the dots are buttons, and both announce what they do.
 *
 * And it must respect prefers-reduced-motion, where automatic movement is not a
 * preference but an accessibility need — vestibular disorders make drifting
 * content genuinely unpleasant.
 */
export function PhotoCarousel({
  photos,
  className,
  intervalMs = 5000,
  priority = false,
}: {
  photos: CarouselPhoto[];
  className?: string;
  intervalMs?: number;
  priority?: boolean;
}) {
  const t = useTranslations('engagement');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Set once a reader touches a control, and never unset.
  const [steered, setSteered] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  const total = photos.length;

  const go = useCallback(
    (next: number) => setIndex(((next % total) + total) % total),
    [total],
  );

  useEffect(() => {
    if (total < 2 || paused || steered) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const id = window.setInterval(() => setIndex((i) => (i + 1) % total), intervalMs);
    return () => window.clearInterval(id);
  }, [total, paused, steered, intervalMs]);

  // A hidden tab should not burn a timer, and coming back to a carousel that
  // advanced twenty frames while you were elsewhere is disorienting.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (total === 0) return null;

  function step(delta: number) {
    setSteered(true);
    go(index + delta);
  }

  return (
    <div
      ref={holder}
      className={cn('group relative overflow-hidden rounded-xl bg-secondary', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label={t('photosLabel', { count: total })}
    >
      {photos.map((photo, i) => (
        <div
          key={photo.url}
          className={cn(
            'transition-opacity duration-700',
            i === index ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0',
          )}
          aria-hidden={i !== index}
        >
          <Image
            src={photo.url}
            alt={photo.alt}
            width={1200}
            height={800}
            className="h-full w-full object-cover"
            // Only the first frame of the first carousel on a page is worth
            // preloading; the rest would compete with it for bandwidth.
            priority={priority && i === 0}
            sizes="(max-width: 768px) 100vw, 60vw"
          />
          {photo.credit && (
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] text-white backdrop-blur">
              <Camera className="size-3" aria-hidden />
              {t('photoBy', { name: photo.credit })}
            </span>
          )}
        </div>
      ))}

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={t('previousPhoto')}
            className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 opacity-0 shadow transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={t('nextPhoto')}
            className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 opacity-0 shadow transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>

          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((photo, i) => (
              <button
                key={photo.url}
                type="button"
                onClick={() => {
                  setSteered(true);
                  go(i);
                }}
                aria-label={t('goToPhoto', { n: i + 1 })}
                aria-current={i === index}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/85',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
