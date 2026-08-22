/**
 * Savanna dusk backdrop, drawn rather than photographed.
 *
 * A hero photo would mean either licensing costs or a stock image every competitor
 * also uses. This renders in a few KB, never 404s, scales to any viewport, and is
 * genuinely ours. Real destination photography lands on the destination pages in
 * Phase 3, where it does conversion work rather than decoration.
 *
 * The sky runs deep at the top so the transparent header's white nav keeps a
 * comfortable contrast ratio over it.
 */
export function HeroScene() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg
        className="size-full"
        viewBox="0 0 1440 720"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.30 0.075 245)" />
            <stop offset="38%" stopColor="oklch(0.46 0.115 30)" />
            <stop offset="68%" stopColor="oklch(0.66 0.145 50)" />
            <stop offset="100%" stopColor="oklch(0.80 0.135 72)" />
          </linearGradient>

          <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="oklch(0.94 0.10 85)" stopOpacity="0.95" />
            <stop offset="45%" stopColor="oklch(0.86 0.13 70)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="oklch(0.80 0.13 65)" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.42 0.065 40)" />
            <stop offset="100%" stopColor="oklch(0.34 0.055 35)" />
          </linearGradient>
          <linearGradient id="hillMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.28 0.045 38)" />
            <stop offset="100%" stopColor="oklch(0.22 0.035 34)" />
          </linearGradient>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.185 0.028 36)" />
            <stop offset="100%" stopColor="oklch(0.145 0.020 34)" />
          </linearGradient>
        </defs>

        <rect width="1440" height="720" fill="url(#sky)" />

        {/* Low sun with atmospheric bloom */}
        <circle cx="1010" cy="486" r="230" fill="url(#sunGlow)" />
        <circle cx="1010" cy="486" r="52" fill="oklch(0.95 0.09 85)" opacity="0.92" />

        {/* Haze bands — reads as heat shimmer on the horizon */}
        <g opacity="0.16">
          <rect x="0" y="470" width="1440" height="3" fill="oklch(0.95 0.06 85)" />
          <rect x="0" y="492" width="1440" height="2" fill="oklch(0.95 0.06 85)" />
          <rect x="0" y="512" width="1440" height="4" fill="oklch(0.95 0.06 85)" />
        </g>

        {/* Distant escarpment — the Rift Valley wall */}
        <path
          d="M0 505 L120 486 L245 497 L390 470 L505 492 L640 466 L790 490 L900 474 L1040 496 L1190 472 L1320 492 L1440 478 L1440 720 L0 720 Z"
          fill="url(#hillFar)"
          opacity="0.78"
        />

        {/* Mid ridge */}
        <path
          d="M0 556 L160 538 L320 552 L470 530 L620 550 L780 534 L940 554 L1100 536 L1270 552 L1440 538 L1440 720 L0 720 Z"
          fill="url(#hillMid)"
          opacity="0.9"
        />

        {/* Foreground plain */}
        <path
          d="M0 616 L200 604 L420 614 L640 600 L860 616 L1080 602 L1300 614 L1440 606 L1440 720 L0 720 Z"
          fill="url(#ground)"
        />

        {/* Acacia grove — flat-topped canopies, staggered for depth */}
        <g fill="oklch(0.13 0.018 34)">
          <AcaciaSilhouette x={168} y={604} scale={1.15} />
          <AcaciaSilhouette x={1216} y={612} scale={0.95} />
          <AcaciaSilhouette x={560} y={598} scale={0.6} opacity={0.72} />
          <AcaciaSilhouette x={905} y={602} scale={0.48} opacity={0.6} />
        </g>

        {/* A distant herd, barely there — the detail that sells the place */}
        <g fill="oklch(0.16 0.02 34)" opacity="0.55">
          <ellipse cx="700" cy="590" rx="9" ry="5" />
          <ellipse cx="726" cy="594" rx="7" ry="4" />
          <ellipse cx="748" cy="589" rx="8" ry="4.5" />
          <ellipse cx="676" cy="595" rx="6" ry="3.5" />
        </g>
      </svg>

      {/* Legibility scrim for the headline block */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/35 to-transparent" />
      {/* Blend the scene into the page below */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

function AcaciaSilhouette({
  x,
  y,
  scale = 1,
  opacity = 1,
}: {
  x: number;
  y: number;
  scale?: number;
  opacity?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      {/* Trunk, tapered and slightly off-vertical the way they actually grow */}
      <path d="M-4 0 L-2.5 -46 L2.5 -46 L4 0 Z" />
      {/* Primary fork */}
      <path d="M-2 -44 L-22 -60 L-19 -63 L0 -49 L19 -63 L22 -60 L2 -44 Z" />
      {/* Umbrella canopy */}
      <path d="M-62 -64c10-15 33-23 62-23s52 8 62 23c-14-7-33-11-53-12l-1 5c16 1 30 4 42 9-17-4-37-6-58-5l-1 5c-17-1-33-3-46-6 12-4 26-7 42-8l-1-5c-19 1-36 5-48 12Z" />
    </g>
  );
}
