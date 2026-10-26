import * as Icons from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The one thing shown where a photograph is missing — design.md §5.1.2.
 *
 * It replaces two fabrications. A monogram on a coloured gradient, which read
 * as a brand mark the business never chose; and a generated landscape — six
 * biomes, seeded horizons, a plate with the place name — which drew a turquoise
 * sea behind a Zanzibar hotel and layered canopy behind a Bwindi lodge. Both
 * were careful work and both made the same claim: that the site knows what the
 * place looks like. §5.1.1 is blunt about it ("No fake photos"), and the reason
 * is in the numbers — about 90% of the covers in this database do not load, so
 * whatever stands in that slot is most of what a visitor sees. A drawing of a
 * sunset tells them the directory is decorated. A category icon and the word
 * "No photo yet" tells them the listing is incomplete, which is true and is
 * the thing an operator can fix.
 *
 * Three rules from §5.1.2 that are easy to lose later:
 *
 * It takes the same aspect ratio as the real media slot — the caller sizes it —
 * so adding a photograph does not move the layout.
 *
 * It never offers "See all photos" and never counts as a photo. §9.2 and §5.1.4
 * gate Featured and Similar on *real* photographs; a fallback must not be able
 * to satisfy a photo count anywhere.
 *
 * It is `aria-hidden`. The card beside it already names the business and its
 * category, so announcing "no photo" to a screen reader adds a sentence and no
 * information. §5.4: "Fallbacks are aria-hidden."
 */

/**
 * The topographic pattern, at 6% — a contour field rather than a landscape.
 *
 * Deliberately abstract: concentric rounded contours read as a map texture at
 * any size and do not resolve into a place. That is the distinction §5.1 draws,
 * and it is also why this is one fixed pattern and not seeded per listing —
 * variation per business is what made the old drawing look like a photograph
 * of somewhere specific.
 */
function Contours() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full opacity-[0.06]"
      viewBox="0 0 160 120"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M-10 ${92 - i * 13} C 20 ${78 - i * 13}, 36 ${102 - i * 13}, 66 ${88 - i * 13} S 118 ${
            66 - i * 13
          }, 170 ${84 - i * 13}`}
        />
      ))}
    </svg>
  );
}

/**
 * `responsive` is the directory's size. §7.2.5 asks for the default card at
 * ≥640 px and the compact one below, which is a viewport switch a server
 * component cannot make as a prop — so the two sizes become one set of classes
 * instead of two rendered subtrees.
 */
export type MediaFallbackSize = 'sm' | 'md' | 'lg' | 'responsive';

export function MediaFallback({
  /**
   * A lucide icon name, as stored on the category row (`categories.icon`), so
   * adding a category stays a data change and not a deploy. An unknown or
   * misspelled name falls back rather than throwing.
   */
  icon,
  /** The category name — "Safaris & Tour Operators". Omitted when unknown. */
  label,
  className,
  size = 'md',
  pattern = true,
}: {
  icon?: string | null;
  label?: string | null;
  className?: string;
  /**
   * `sm` is for a thumbnail below about 120 px, where a 32 px icon and a line
   * of text do not both fit; the label is dropped and the icon shrinks.
   */
  size?: MediaFallbackSize;
  pattern?: boolean;
}) {
  const Icon =
    (icon && (Icons as unknown as Record<string, typeof Icons.Image>)[icon]) || Icons.ImageOff;

  return (
    <div
      aria-hidden
      className={cn(
        'relative flex size-full flex-col items-center justify-center gap-2 overflow-hidden',
        'bg-surface-sunken text-muted-foreground',
        className,
      )}
    >
      {pattern && <Contours />}
      <Icon
        className={cn(
          'relative',
          size === 'sm' && 'size-5',
          size === 'md' && 'size-8',
          size === 'lg' && 'size-10',
          size === 'responsive' && 'size-5 sm:size-8',
        )}
        strokeWidth={1.5}
      />
      {label && size !== 'sm' && (
        <span
          className={cn(
            'relative max-w-[85%] truncate px-2 text-center text-caption font-medium uppercase tracking-[0.08em]',
            // In the 112px thumbnail a category name is two truncated words on
            // top of a 20px icon; from 640 the slot is 4:3 and holds both.
            size === 'responsive' && 'hidden sm:block',
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
