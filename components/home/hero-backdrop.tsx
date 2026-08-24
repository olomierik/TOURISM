'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

import { HeroScene } from '@/components/home/hero-scene';
import { cn } from '@/lib/utils';

export type HeroFrame = { src: string; label?: string | null };

/** How long each photograph holds before the next fades in. */
const HOLD_MS = 7000;

/**
 * The hero background: a slow crossfade through photographs, the drawn scene
 * when there are none.
 *
 * Three constraints shape this, and each one is the difference between a hero
 * that helps and one that costs more than it earns.
 *
 * Only the first frame is eager. It is the Largest Contentful Paint element, so
 * it carries `priority`; the rest are lazy and arrive as the rotation reaches
 * them. Loading forty photographs to display one would make the page far slower
 * than the single static file this replaces, on exactly the mobile connections
 * this audience browses on.
 *
 * The transition is a long crossfade rather than a slide or a quick cut. A
 * headline and a search box sit on top of this; anything fast or directional
 * makes the text hard to read and reads as a fault rather than a flourish.
 *
 * And it holds still for anyone who has asked it to. prefers-reduced-motion is
 * a statement about what makes a person unwell, not a style preference.
 */
export function HeroBackdrop({ frames }: { frames: HeroFrame[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (frames.length < 2) return;

    // Checked here rather than during render: reading a media query while
    // rendering would disagree with the server and break hydration. Leaving the
    // interval unset holds the first frame, which is the whole ask.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = setInterval(() => setIndex((i) => (i + 1) % frames.length), HOLD_MS);
    return () => clearInterval(id);
  }, [frames.length]);

  if (!frames.length) return <HeroScene />;

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {frames.map((frame, i) => {
        // Every frame stays mounted and fades, rather than swapping the src on
        // one element. Swapping would show the previous photograph blank while
        // the next decodes, which is a flash of empty hero on every rotation.
        const visible = i === index;
        // The current frame and the one after it. Nothing further ahead is
        // worth fetching, and anything behind has already loaded. With reduced
        // motion the index never moves, so this stays at the first two.
        const near = i === index || i === (index + 1) % frames.length;

        return (
          <div
            key={frame.src}
            aria-hidden={!visible}
            className={cn(
              'absolute inset-0 transition-opacity duration-[2000ms] ease-in-out',
              visible ? 'opacity-100' : 'opacity-0',
            )}
          >
            {near && (
              <Image
                src={frame.src}
                alt=""
                fill
                priority={i === 0}
                fetchPriority={i === 0 ? 'high' : 'auto'}
                loading={i === 0 ? 'eager' : 'lazy'}
                sizes="100vw"
                className="object-cover object-center"
              />
            )}
          </div>
        );
      })}

      {/* Two scrims rather than one flat overlay.

          The headline and search sit on the left, so the darkening is weighted
          there and fades out to the right — the photograph stays as bright as it
          was shot, which is the reason to use one at all. A flat overlay heavy
          enough for the text mutes the entire image.

          The second is a shallow band at the top, for the header's white nav
          text against a bright sky. It only needs to cover the header's height,
          not the whole frame. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/45 to-transparent"
      />

      {/* Names the place currently on screen. Without it a rotating hero is just
          restless; with it, each frame is doing the job of showing what the site
          actually covers. */}
      {frames[index]?.label && (
        <p className="absolute bottom-5 right-5 z-10 rounded-full bg-black/40 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
          {frames[index].label}
        </p>
      )}
    </div>
  );
}
