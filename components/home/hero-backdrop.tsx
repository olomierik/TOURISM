import Image from 'next/image';

import { HeroScene } from '@/components/home/hero-scene';

/**
 * The hero background: a photograph when one has been supplied, the drawn scene
 * otherwise.
 *
 * Takes the resolved source as a prop rather than looking for the file itself.
 * Hero is a client component, so any filesystem check inside this tree gets
 * pulled into the browser bundle and the build fails outright on `node:fs`. The
 * page decides; this only renders.
 */
export function HeroBackdrop({ src }: { src: string | null }) {
  if (!src) return <HeroScene />;

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <Image
        src={src}
        alt=""
        fill
        // The hero is the largest paint on the page and decides LCP, so it is
        // fetched at highest priority and never lazy-loaded.
        priority
        fetchPriority="high"
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* The header's nav text is white and sits over this. A photograph with a
          bright sky would make it unreadable, so the scrim is weighted to the
          top as well as the bottom rather than being a flat overlay. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/60"
      />
    </div>
  );
}
