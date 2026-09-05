import { biomeFor, BIOME_PALETTE, type Biome } from '@/lib/media/biome';
import { cn } from '@/lib/utils';

/**
 * Deterministic landscape stand-in for a missing image.
 *
 * This is not an edge case. 1,190 of 2,618 approved listings — 45% — have no
 * cover image, no traveller photos and no rows in `media`, so for nearly half
 * the directory this drawing *is* the picture. It has to carry a grid.
 *
 * What it replaces drew one composition — sunset, ridge, one acacia — varying
 * hue, sun position, one of three hard-coded ridge paths and which side the
 * tree stood on. Every card was recognisably the same picture, and in a grid
 * where half the tiles have no photograph that is most of what made the site
 * feel like wallpaper.
 *
 * Three things changed.
 *
 * The composition follows the region. Six landscapes — savanna, coastal,
 * highland, lake, forest, urban — so a Zanzibar hotel gets a flat turquoise sea
 * horizon and a Bwindi lodge gets layered canopy. The drawing says something
 * true about the place instead of decorating a gap, and the region data it
 * reads is the same data the filters use.
 *
 * The silhouettes are generated rather than chosen. Seven seeded control points
 * through a smooth polyline gives effectively unbounded distinct horizons for
 * the same code size, where `hash % 3` gave three.
 *
 * And it can carry the place name. A plate that says ARUSHA · TANZANIA is not
 * pretending to be a photograph; it is admitting what it is and being useful
 * anyway. Opt-in, because on a full-bleed hero the title already sits there.
 */
function hashOf(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** A small deterministic sequence from one seed, so each drawn feature varies independently. */
function rng(hash: number) {
  let state = hash || 1;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * A horizon from `count` seeded points, as a closed path down to the bottom.
 *
 * `jag` is how far each point may stray from the baseline: a coastal horizon
 * wants almost none, a highland skyline wants a lot. That single number is what
 * makes six landscapes out of one function.
 */
function horizon(next: () => number, baseline: number, jag: number, count = 7) {
  const step = 100 / (count - 1);
  const points: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = r1(i * step);
    const y = r1(baseline + (next() - 0.5) * 2 * jag);
    points.push(`${x} ${y}`);
  }
  return `M${points.join(' L')} L100 100 L0 100 Z`;
}

/**
 * Flat-topped blocks, for the one biome a horizon function cannot draw.
 *
 * A city is not a landscape and the polyline above cannot fake one: a jagged
 * line is a mountain range whatever colour it is painted, which is precisely
 * how the first attempt read — 614 urban listings drawn as hills. Buildings
 * need vertical edges and flat tops, so they get their own primitive.
 */
function skyline(next: () => number) {
  const blocks: { x: number; y: number; w: number }[] = [];
  let x = -4;
  while (x < 100) {
    const w = r1(6 + next() * 10);
    blocks.push({ x: r1(x), y: r1(52 + next() * 26), w });
    x += w + r1(next() * 2);
  }
  return blocks;
}

/** Ridge lines stacked back to front, each paler and lower than the last. */
function layers(next: () => number, biome: Biome) {
  const p = BIOME_PALETTE[biome];
  switch (biome) {
    case 'coastal':
      // A sea horizon is a straight line. Anything else reads as a lake.
      return [
        { d: horizon(next, 62, 0.4, 4), fill: p.far, opacity: 1 },
        { d: horizon(next, 78, 1.2, 5), fill: p.near, opacity: 1 },
      ];
    case 'highland':
      return [
        { d: horizon(next, 46, 9, 7), fill: p.far, opacity: 0.85 },
        { d: horizon(next, 60, 6, 7), fill: p.near, opacity: 0.95 },
        { d: horizon(next, 76, 3, 6), fill: p.detail, opacity: 1 },
      ];
    case 'lake':
      return [
        { d: horizon(next, 55, 1.6, 5), fill: p.far, opacity: 0.9 },
        { d: horizon(next, 66, 0.5, 4), fill: p.near, opacity: 1 },
      ];
    case 'forest':
      return [
        { d: horizon(next, 52, 5, 9), fill: p.far, opacity: 0.9 },
        { d: horizon(next, 64, 6, 9), fill: p.near, opacity: 0.95 },
        { d: horizon(next, 78, 5, 8), fill: p.detail, opacity: 1 },
      ];
    case 'urban':
      // Only the back wash is a horizon; the blocks are drawn separately.
      return [{ d: horizon(next, 76, 1.5, 5), fill: p.near, opacity: 1 }];
    default:
      return [
        { d: horizon(next, 56, 4, 7), fill: p.far, opacity: 0.75 },
        { d: horizon(next, 72, 3, 6), fill: p.near, opacity: 1 },
      ];
  }
}

/** The one silhouette that names the place: acacia, palm, or nothing. */
function motif(next: () => number, biome: Biome, detail: string, far: string) {
  const x = r1(14 + next() * 70);
  if (biome === 'savanna') {
    const s = r1(0.9 + next() * 0.35);
    return (
      <g transform={`translate(${x} 72) scale(${s})`} fill={detail}>
        <path d="M-0.8 0 L-0.5 -9 L0.5 -9 L0.8 0 Z" />
        <path d="M-0.4 -8.6 L-4.4 -12 L-3.8 -12.6 L0 -9.8 L3.8 -12.6 L4.4 -12 L0.4 -8.6 Z" />
        <path d="M-12 -12.8c2-3 6.6-4.6 12-4.6s10 1.6 12 4.6c-2.8-1.4-6.6-2.2-10.6-2.4l-.2 1c3.2.2 6 .8 8.4 1.8-3.4-.8-7.4-1.2-11.6-1l-.2 1c-3.4-.2-6.6-.6-9.2-1.2 2.4-.8 5.2-1.4 8.4-1.6l-.2-1c-3.8.2-7.2 1-9.8 2.4Z" />
      </g>
    );
  }
  if (biome === 'coastal') {
    const s = r1(0.9 + next() * 0.3);
    return (
      <g transform={`translate(${x} 78) scale(${s})`} fill={detail}>
        <path d="M-0.5 0 C-0.9 -6 -0.5 -11 0.6 -15 L1.6 -14.7 C0.6 -10.8 0.4 -6 0.7 0 Z" />
        <path d="M1 -15.2c-3.4-2.6-7-3.4-10.4-2.4 3.4-.4 6.6.6 9.4 3Z" />
        <path d="M1.4 -15.4c1.6-3.8 4.4-6.2 8.2-7.2-3 1.8-5.4 4.4-7 7.6Z" />
        <path d="M1.6 -15c3.8-1 7.4-.2 10.6 2.4-3.4-1.4-6.8-1.8-10-1.4Z" />
        <path d="M0.6 -15.6c-1-3.6-.4-6.8 1.8-9.6-.8 3.2-1.2 6.4-.8 9.6Z" />
      </g>
    );
  }
  if (biome === 'urban') {
    const blocks = skyline(next);
    return (
      <g>
        {blocks.map((b, i) => (
          <rect key={`b${i}`} x={b.x} y={b.y} width={b.w} height={100 - b.y} fill={far} />
        ))}
        {/* Lit windows, on the buildings rather than floating beside them.
            Warm amber against the cool dusk is the whole reason a city reads as
            a city at this size. */}
        {blocks.flatMap((b, i) => {
          const cells = [];
          const cols = Math.max(1, Math.floor(b.w / 3.4));
          const rows = Math.max(1, Math.floor((100 - b.y) / 4.4));
          for (let c = 0; c < cols; c++) {
            for (let rw = 0; rw < rows; rw++) {
              if (next() < 0.62) continue;
              cells.push(
                <rect
                  key={`w${i}-${c}-${rw}`}
                  x={r1(b.x + 1.2 + c * 3.4)}
                  y={r1(b.y + 1.6 + rw * 4.4)}
                  width="1.4"
                  height="1.8"
                  fill={detail}
                  opacity="0.75"
                />,
              );
            }
          }
          return cells;
        })}
      </g>
    );
  }
  return null;
}

export function MediaPlaceholder({
  seed,
  className,
  label,
  region,
  category,
  caption,
}: {
  seed: string;
  className?: string;
  label?: string;
  /** Region name or slug — decides the landscape. */
  region?: string | null;
  /** Primary category slug, used only when the region is unknown. */
  category?: string | null;
  /**
   * Prints the place across the bottom of the drawing. Opt-in: a full-bleed
   * hero already carries the title, and two texts on one image fight.
   */
  caption?: string | null;
}) {
  const hash = hashOf(seed);
  const next = rng(hash);
  const biome = biomeFor(region, category);
  const palette = BIOME_PALETTE[biome];

  // Sun low and off-centre. Kept out of the top third so it never collides
  // with the badge stack the cards overlay there.
  const sunX = r1(20 + next() * 60);
  const sunY = biome === 'urban' ? 42 : r1(46 + next() * 12);

  const skyId = `ph-s-${hash % 100000}`;
  const glowId = `ph-g-${hash % 100000}`;

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
          <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.skyTop} />
            <stop offset="52%" stopColor={palette.skyMid} />
            <stop offset="100%" stopColor={palette.skyLow} />
          </linearGradient>
          <radialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor={palette.skyLow} stopOpacity="0.95" />
            <stop offset="100%" stopColor={palette.skyLow} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100" height="100" fill={`url(#${skyId})`} />
        <circle cx={sunX} cy={sunY} r="30" fill={`url(#${glowId})`} />
        {biome !== 'urban' && (
          <circle cx={sunX} cy={sunY} r="5" fill={palette.skyLow} opacity="0.85" />
        )}

        {layers(next, biome).map((l, i) => (
          <path key={i} d={l.d} fill={l.fill} opacity={l.opacity} />
        ))}

        {motif(next, biome, palette.detail, palette.far)}
      </svg>

      {/* A plate, not a caption on a photograph — real text rather than SVG
          <text> so it scales with the page and picks up the site's font.
          aria-hidden because the card body already states the same place, and
          announcing it twice is worse than not announcing it. */}
      {caption && (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 pb-2 pt-6"
        >
          <span className="text-[0.625rem] font-medium uppercase tracking-[0.14em] text-white/85">
            {caption}
          </span>
        </div>
      )}
    </div>
  );
}
