import { cn } from '@/lib/utils';
import { MARK_LAND, MARK_SUN, MARK_VIEW_BOX } from '@/components/layout/logo-paths';

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
  return (
    <svg
      viewBox={MARK_VIEW_BOX}
      className={cn('h-9 w-auto', className)}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <path d={MARK_SUN} fill="var(--brand-gold)" fillRule="evenodd" />
      <path d={MARK_LAND} fill="var(--brand-mark)" fillRule="evenodd" />
    </svg>
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
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {showWordmark && (
        <span
          className="font-display text-lg font-bold leading-none tracking-tight"
          style={{ color: 'var(--brand-mark)' }}
        >
          <span>Explore</span>
          <span>Tanzania</span>
          {/* Dropped below 380px: on a 360px phone the suffix is the 12px
              that pushed the header's search button off the screen. */}
          <span className="ml-0.5 align-baseline text-[0.6em] font-semibold opacity-60 max-[379px]:hidden">
            .online
          </span>
        </span>
      )}
    </span>
  );
}
