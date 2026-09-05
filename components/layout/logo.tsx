import { cn } from '@/lib/utils';

/**
 * Brand mark, drawn from the ExploreTanzania.online logo.
 *
 * The uploaded artwork is a photographic map pin — Kilimanjaro over savanna and
 * coastline, a giraffe and an elephant, the flag sweeping out as a ribbon with
 * an aircraft trailing it. Beautiful at 400px and unreadable at 32, which is the
 * size it is actually used at in a sticky header and a browser tab.
 *
 * So this is the same idea reduced to what survives: the pin silhouette, the
 * snow-capped peak, and the flag ribbon. Those three are what makes the mark
 * recognisable at a glance, and each is a shape rather than a detail. The
 * giraffe and the aircraft are gone because at 32px they are three pixels of
 * noise, and keeping them would cost the legibility of the peak.
 *
 * Flag order is exact — green, gold, black, gold, blue — because a Tanzanian
 * reader notices immediately when it is not, and it is the one detail in the
 * mark that is a fact rather than a choice.
 *
 * Drawn rather than an <img> so it stays crisp at favicon size, inverts onto
 * hero photography, and costs no request.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn('size-8', className)}
      aria-hidden="true"
    >
      <defs>
        {/* Sky inside the pin: dawn gold lifting into the brand blue, which is
            the gradient the photograph actually has. */}
        <linearGradient id="et-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.86 0.14 85)" />
          <stop offset="52%" stopColor="oklch(0.72 0.11 235)" />
          <stop offset="100%" stopColor="oklch(0.45 0.15 261)" />
        </linearGradient>
        {/* The pin outline doubles as a clip, so nothing inside can spill past
            the silhouette at any size. */}
        <clipPath id="et-pin">
          <path d="M16 1.6c-5.4 0-9.8 4.3-9.8 9.7 0 7 9.8 19.1 9.8 19.1s9.8-12.1 9.8-19.1c0-5.4-4.4-9.7-9.8-9.7Z" />
        </clipPath>
      </defs>

      <g clipPath="url(#et-pin)">
        <rect width="32" height="32" fill="url(#et-sky)" />

        {/* Kilimanjaro. The flat, wide summit is the whole point — a pointed
            triangle reads as any mountain, this one reads as that mountain. */}
        <path d="M2 20.5l6.4-7.2 2.6 2.4 4.2-5.6 5 6.6 3.4-2.6 6.4 6.4v6H2z" fill="oklch(0.42 0.09 258)" />
        {/* Snowcap, following the same ridge so the peak reads at 20px. */}
        <path d="M11.4 11.9l3.8-5.1 4.2 5.6-2.1 1.1-2.4-1.5-2 1.3z" fill="oklch(0.98 0.01 250)" />

        {/* Savanna floor. */}
        <path d="M2 21.6h28V32H2z" fill="oklch(0.70 0.12 92)" />

        {/* The flag as a ribbon across the lower third — green, gold, black,
            gold, blue, in that order. */}
        <path d="M-1 30.5L33 17.4v2.6L-1 33.1z" fill="oklch(0.62 0.15 157)" />
        <path d="M-1 33.1L33 20v1.1L-1 34.2z" fill="oklch(0.84 0.17 85)" />
        <path d="M-1 34.2L33 21.1v2.9L-1 37.1z" fill="oklch(0.22 0.02 262)" />
        <path d="M-1 37.1L33 24v1.1L-1 38.2z" fill="oklch(0.84 0.17 85)" />
        <path d="M-1 38.2L33 25.1V28L-1 41.1z" fill="oklch(0.45 0.15 261)" />
      </g>

      {/* Pin edge, drawn last so it sits above the fill. */}
      <path
        d="M16 1.6c-5.4 0-9.8 4.3-9.8 9.7 0 7 9.8 19.1 9.8 19.1s9.8-12.1 9.8-19.1c0-5.4-4.4-9.7-9.8-9.7Z"
        stroke="oklch(0.386 0.148 260.7)"
        strokeWidth="1.7"
        fill="none"
      />
    </svg>
  );
}

/**
 * The lockup.
 *
 * "Explore" in blue, "Tanzania" in green, matching the artwork — and matching
 * the palette's own rule, where blue is structure and green is what is local.
 * The ".online" is set small and quiet: it is part of the name and not part of
 * the shout.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {/* Monochrome, beside a coloured mark.

          It used to be primary + accent, which under the new tokens would put
          "Explore" in pine and "Tanzania" in Flame — and Flame is the call to
          action. A wordmark that wears the button colour is a wordmark that
          competes with every button on the page. A coloured mark beside
          ink-black type is the stronger lockup anyway. */}
      {showWordmark && (
        <span className="font-display text-lg font-bold leading-none tracking-tight text-foreground">
          <span>Explore</span>
          <span>Tanzania</span>
          <span className="ml-0.5 align-baseline text-[0.6em] font-semibold text-muted-foreground">
            .online
          </span>
        </span>
      )}
    </span>
  );
}
