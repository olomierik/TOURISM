import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';

import { MARK_VIEW_BOX } from '@/components/layout/logo-paths';

/**
 * The brand mark: Kilimanjaro under a rising sun, with an acacia in front.
 *
 * This is the official logo (supplied 14 November 2026) rather than an
 * interpretation of it. The outlines are traced from the artwork itself by
 * scripts/generate-brand-assets.mjs, which also produces every icon, the
 * favicon and the email mark from the same file — so the mark in the tab, the
 * mark on a home screen and the mark Google shows beside a search result are
 * one drawing and cannot drift apart.
 *
 * Drawn rather than an <img> for one reason: colour. The mountain is the
 * artwork's pine on the sand ground and near-paper on the dark one, which an
 * image cannot do without shipping two files and swapping them in CSS.
 *
 * The snow and the gaps between branches are holes in the path rather than
 * white shapes. That is what makes the single file work on both themes — a
 * hole shows the page behind it, so the cap keeps its contrast whatever the
 * ground is, instead of being white-on-paper in one theme and white-on-white
 * in the other.
 *
 * Sized by height. The artwork is 1.77:1 in this crop, so h-9 is 64px wide —
 * about the smallest it can be and still read as a mountain. Below that it
 * becomes a wedge, which is why the favicon uses a tighter crop of the summit
 * rather than this one shrunk.
 */
export function LogoMark({ className }: { className?: string }) {
  // Two masked layers rather than inline paths (SEO brief T4): the shapes
  // are files served once and cached (app/brand-mark), the colours are still
  // the theme's, and the holes still show the ground behind. The aspect
  // ratio is the viewBox's, so sizing by height works as it did.
  const [, , w, h] = MARK_VIEW_BOX.split(' ').map(Number);
  const layer = (file: string): CSSProperties => {
    const mask = `url(/brand-mark/${file}) center / contain no-repeat`;
    return { mask, WebkitMask: mask };
  };
  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-block h-9 shrink-0', className)}
      style={{ aspectRatio: `${w} / ${h}` }}
    >
      <span className="absolute inset-0 bg-[var(--brand-gold)]" style={layer('sun.svg')} />
      <span className="absolute inset-0 bg-[var(--brand-mark)]" style={layer('land.svg')} />
    </span>
  );
}

/**
 * The lockup: the mark beside the wordmark.
 *
 * The wordmark stays live text rather than becoming part of the image. It
 * reflows, it is selectable, it drops its suffix on a narrow phone, and it
 * survives a mark that fails to load — none of which a single flattened
 * lockup image does.
 *
 * It takes the mark's own colour, so the two halves of the lockup match the
 * artwork, where the type is the same pine as the mountain. It used to set no
 * colour at all, because the header once rendered transparent over a hero
 * photograph and switched its contents to white; site-header.tsx removed that
 * state along with the scroll listener that drove it, so the lockup now only
 * ever sits on a theme surface and can say what colour it is.
 */
export function Logo({
  className,
  showWordmark = true,
  compact = false,
}: {
  className?: string;
  showWordmark?: boolean;
  /** The phone app bar's size: a smaller mark and wordmark below sm. */
  compact?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', compact && 'max-sm:gap-1.5', className)}>
      <LogoMark className={cn(compact && 'max-sm:h-7')} />
      {showWordmark && (
        <span
          className={cn(
            'whitespace-nowrap font-display text-lg font-bold leading-none tracking-tight',
            compact && 'max-sm:text-[1.0625rem]',
          )}
          style={{ color: 'var(--brand-mark)' }}
        >
          <span>Explore</span>
          <span>Tanzania</span>
          {/* Dropped below 380px: on a 360px phone the suffix is the 12px
              that pushed the header's search button off the screen. */}
          <span
            className={cn(
              'ml-0.5 align-baseline text-[0.6em] font-semibold opacity-60 max-[379px]:hidden',
              compact && 'max-[429px]:hidden',
            )}
          >
            .online
          </span>
        </span>
      )}
    </span>
  );
}
