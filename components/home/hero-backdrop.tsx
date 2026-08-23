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
      {/* Two scrims rather than one flat overlay.
          
          The headline and search sit on the left, so the darkening is weighted
          there and fades out to the right — the mountain and the herd stay as
          bright as they were shot, which is the reason to use a photograph at
          all. A flat overlay heavy enough for the text mutes the entire image.
          
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
    </div>
  );
}
