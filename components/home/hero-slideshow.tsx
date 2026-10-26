'use client';

import * as React from 'react';
import Image from 'next/image';

import { IconButton } from '@/components/ui/icon-button';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A frame with its alt text already written.
 *
 * The alt arrives as a string rather than as a function the server passes in.
 * That is not a style preference: a function cannot cross the server/client
 * boundary at all, and React says so at runtime, not at compile time — this
 * file typechecked cleanly while every render of the home page threw
 * "Functions cannot be passed directly to Client Components".
 */
export type SlideshowFrame = { src: string; label: string | null; alt: string };

/**
 * The hero slideshow.
 *
 * **This is a deliberate departure from design.md §3.5**, which says "No
 * autoplaying carousels or crossfading hero images … ship one LCP image".
 * Erick asked for a slideshow (2026-10) and that is his call to make; what
 * follows is how to have one without paying the costs §3.5 was protecting
 * against.
 *
 * **Only the first frame is eligible to be the LCP.** It carries `priority`
 * and `fetchPriority="high"`; every other frame is lazy and only starts
 * loading once the first has painted. So the largest contentful paint is one
 * image, exactly as before — the slideshow costs nothing until after the page
 * is usable. §12's budget is "1 image above the fold ≤ 120 KB", and that stays
 * true at the moment it is measured.
 *
 * **It stops for people who asked it to.** `prefers-reduced-motion: reduce`
 * holds frame one and never advances — motion is the thing some readers cannot
 * tolerate, and an autoplaying crossfade is exactly the pattern that triggers
 * it. There is also a visible pause control, because WCAG 2.2.2 requires any
 * automatic movement lasting more than five seconds to be pausable, and a
 * slideshow that cannot be stopped fails that outright.
 *
 * **It pauses when nobody is looking.** A hidden tab keeps firing timers and
 * decoding images on a phone that has moved on; `document.hidden` stops it.
 *
 * The crossfade is opacity only, never transform or layout, so it cannot move
 * anything on the page — CLS stays at zero.
 */

/** Long enough to look at a photograph, short enough to see a second one. */
const FRAME_MS = 6000;

export function HeroSlideshow({
  frames,
  pauseLabel,
  playLabel,
  className,
}: {
  frames: SlideshowFrame[];
  pauseLabel: string;
  playLabel: string;
  className?: string;
}) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  // Reduced motion is read as a live query rather than once, so a reader who
  // changes the system setting is obeyed without reloading.
  const reduced = React.useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );

  const total = frames.length;
  const running = total > 1 && !paused && !reduced;

  React.useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % total);
    };
    const id = setInterval(tick, FRAME_MS);
    return () => clearInterval(id);
  }, [running, total]);

  if (total === 0) return null;

  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-surface-sunken', className)}>
      {frames.map((frame, i) => (
        <Image
          key={frame.src}
          src={frame.src}
          // §5.4: only the frame on screen carries a description; the rest
          // are decorative duplicates of the same slot.
          alt={i === index ? frame.alt : ''}
          fill
          // Only the first frame competes to be the LCP. The rest are lazy, so
          // a slideshow costs the same first paint as a single photograph.
          priority={i === 0}
          fetchPriority={i === 0 ? 'high' : 'auto'}
          loading={i === 0 ? 'eager' : 'lazy'}
          sizes="(min-width:1024px) 480px, 100vw"
          quality={70}
          className={cn(
            'object-cover transition-opacity duration-[var(--dur-slow)] ease-[var(--ease-in-out)]',
            // Opacity only — nothing here can shift layout, so CLS stays 0.
            i === index ? 'opacity-100' : 'opacity-0',
          )}
          // Frames that are not showing are out of the accessibility tree;
          // otherwise a screen reader meets eight images of the same slot.
          aria-hidden={i !== index}
        />
      ))}

      {total > 1 && !reduced && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-3">
          {/* Dots double as controls. They are buttons, not decoration: a
              reader who wants the fourth photograph should be able to ask for
              it rather than wait for it. */}
          <div className="flex gap-1.5">
            {frames.map((frame, i) => (
              <button
                key={frame.src}
                type="button"
                aria-label={frame.label ?? `${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  'h-1.5 rounded-pill transition-all duration-[var(--dur-base)]',
                  'outline-offset-4',
                  i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80',
                )}
              />
            ))}
          </div>

          {/* WCAG 2.2.2: anything that moves by itself for more than five
              seconds needs a way to stop it. */}
          <IconButton
            type="button"
            size="sm"
            variant="on-photo"
            label={paused ? playLabel : pauseLabel}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
          </IconButton>
        </div>
      )}
    </div>
  );
}
