import { cn } from '@/lib/utils';

/**
 * Deterministic landscape stand-in for a missing image.
 *
 * Demo listings carry no photography and real listings will have gaps too. A
 * grey box in a photography-led grid reads as a broken page, and a flat gradient
 * reads as a placeholder — so this draws a miniature of the hero's savanna scene
 * instead: same visual language, a few hundred bytes, and it cannot 404.
 *
 * The seed drives hue, sun position and ridge shape, so two cards side by side
 * are visibly different while each stays stable across renders.
 */
function hashOf(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function MediaPlaceholder({
  seed,
  className,
  label,
}: {
  seed: string;
  className?: string;
  label?: string;
}) {
  const hash = hashOf(seed);

  // Golden-angle stepping spreads consecutive seeds far apart on the wheel, so
  // neighbouring cards in a grid never land on near-identical colours the way a
  // plain modulo would.
  const hue = (hash * 137.508) % 360;
  // Constrained to the warm dusk arc (amber through rose to deep teal) rather
  // than the full wheel, so every card still reads as Tanzania at golden hour.
  const skyHue = 20 + (hue % 60); // 20-80: amber to gold
  const deepHue = 240 + (hue % 40); // 240-280: dusk blue
  const sunX = 24 + (hash % 56); // 24-80% across
  const ridge = hash % 3; // one of three horizon profiles

  const ridges = [
    'M0 58 L14 53 L30 57 L46 50 L62 56 L78 51 L100 55 L100 100 L0 100 Z',
    'M0 55 L18 60 L34 52 L52 58 L70 51 L86 57 L100 53 L100 100 L0 100 Z',
    'M0 60 L12 54 L28 59 L44 53 L60 60 L76 54 L100 58 L100 100 L0 100 Z',
  ];

  const gradientId = `ph-sky-${hash % 100000}`;
  const glowId = `ph-glow-${hash % 100000}`;

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg
        className="size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`oklch(0.32 0.07 ${deepHue})`} />
            <stop offset="45%" stopColor={`oklch(0.48 0.11 ${skyHue + 340})`} />
            <stop offset="75%" stopColor={`oklch(0.66 0.14 ${skyHue})`} />
            <stop offset="100%" stopColor={`oklch(0.78 0.13 ${skyHue + 12})`} />
          </linearGradient>
          <radialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor={`oklch(0.94 0.10 ${skyHue + 20})`} stopOpacity="0.9" />
            <stop offset="100%" stopColor={`oklch(0.85 0.12 ${skyHue})`} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100" height="100" fill={`url(#${gradientId})`} />
        <circle cx={sunX} cy="56" r="26" fill={`url(#${glowId})`} />
        <circle cx={sunX} cy="56" r="6" fill={`oklch(0.95 0.08 ${skyHue + 25})`} opacity="0.9" />

        {/* Far ridge */}
        <path d={ridges[ridge]} fill="oklch(0.30 0.05 30)" opacity="0.55" />
        {/* Near ground */}
        <path
          d="M0 72 L20 68 L42 73 L64 67 L84 73 L100 70 L100 100 L0 100 Z"
          fill="oklch(0.17 0.025 34)"
        />

        {/* A single acacia, mirrored by seed so it does not always sit left */}
        <g
          transform={`translate(${hash % 2 ? 78 : 18} 72) scale(${0.85 + (hash % 5) / 20})`}
          fill="oklch(0.13 0.018 34)"
        >
          <path d="M-0.8 0 L-0.5 -9 L0.5 -9 L0.8 0 Z" />
          <path d="M-0.4 -8.6 L-4.4 -12 L-3.8 -12.6 L0 -9.8 L3.8 -12.6 L4.4 -12 L0.4 -8.6 Z" />
          <path d="M-12 -12.8c2-3 6.6-4.6 12-4.6s10 1.6 12 4.6c-2.8-1.4-6.6-2.2-10.6-2.4l-.2 1c3.2.2 6 .8 8.4 1.8-3.4-.8-7.4-1.2-11.6-1l-.2 1c-3.4-.2-6.6-.6-9.2-1.2 2.4-.8 5.2-1.4 8.4-1.6l-.2-1c-3.8.2-7.2 1-9.8 2.4Z" />
        </g>
      </svg>
    </div>
  );
}
