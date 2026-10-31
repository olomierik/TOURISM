import { ArrowRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Href = React.ComponentProps<typeof Link>['href'];

/**
 * Standard section frame: an optional eyebrow, the heading, optional subtitle,
 * optional "see all" link that collapses to the foot of the section on mobile
 * where a right-aligned header link is easy to miss.
 */
export function Section({
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
  children,
  className,
  muted = false,
  id,
  eyebrow,
  size = 'default',
}: {
  title: string;
  /** A short coloured line above the title (Savanna Modern, homepage). */
  eyebrow?: string;
  /**
   * `lg` is the homepage's heading: 30–40px and extra bold, with the "view
   * all" link as an outlined pill. Other pages keep the quieter default.
   */
  size?: 'default' | 'lg';
  subtitle?: string;
  viewAllHref?: Href;
  viewAllLabel?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * Anchor target. Long pages — a destination carries eleven sections — need
   * somewhere for a jump link to land, and an id on the section is also what
   * makes those links worth anything to a crawler.
   */
  id?: string;
  muted?: boolean;
}) {
  return (
    <section
      id={id}
      // Offset so a jump link does not put the heading behind the sticky
      // header — the anchor lands, the title is hidden, and the page looks
      // like it scrolled to the wrong place.
      className={cn(
        'scroll-mt-[calc(var(--header-h)+1rem)]',
        // The warm paper stock at full strength rather than 40%. Cool paper
        // against warm paper is what makes alternating sections read as two
        // stocks; at 40% it was two barely different greys.
        muted && 'bg-muted',
        className,
      )}
    >
      <div className="container-page py-7 sm:py-section">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            {/* Down one step from 3xl/4xl. A section heading has to be
                clearly a heading, not compete with the page title, and at the
                old size twelve of them were most of a screen between them.
                The classes are unchanged since; the scale under them came down
                17%, so this now renders 24px rising to 30px.
                `font-display` is dropped — globals.css already applies it to
                every h1/h2/h3, so the class was a no-op here. */}
            {/* Bold and plain, as GetYourGuide and Tripadvisor set theirs: the
                weight is the mark that a new part has started. The rule that
                ran out from the heading stopped at the column's 2xl width, so
                it read as a stray stub rather than a divider. */}
            {eyebrow && (
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-accent-strong">
                {eyebrow}
              </p>
            )}
            <h2
              className={cn(
                'tracking-tight',
                size === 'lg'
                  ? 'text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl'
                  : 'text-xl font-bold sm:text-3xl',
              )}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 hidden leading-relaxed text-muted-foreground sm:block">{subtitle}</p>
            )}
          </div>

          {viewAllHref && viewAllLabel && (
            <Link
              href={viewAllHref}
              className={cn(
                'hidden items-center gap-1.5 text-sm font-semibold sm:inline-flex',
                size === 'lg'
                  ? 'h-11 rounded-full border px-5 text-foreground transition-colors hover:border-foreground/40 hover:bg-secondary'
                  : 'text-primary hover:underline',
              )}
            >
              {viewAllLabel}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>

        {/* Not on the Rail itself — see the .reveal comment in globals.css.
            This wraps the section body, which scrolls vertically. */}
        <div className={cn('reveal', size === 'lg' ? 'mt-5 sm:mt-7' : 'mt-4 sm:mt-5')}>{children}</div>

        {viewAllHref && viewAllLabel && (
          <div className={cn('sm:hidden', size === 'lg' ? 'mt-5' : 'mt-4')}>
            <Link
              href={viewAllHref}
              className={cn(
                'inline-flex items-center gap-1.5 text-sm font-semibold',
                // The same pill as the desktop link, 44px tall: the text link
                // was a 21px tap target.
                size === 'lg'
                  ? 'h-11 rounded-full border px-5 text-foreground transition-colors hover:border-foreground/40 hover:bg-secondary'
                  : 'text-primary hover:underline',
              )}
            >
              {viewAllLabel}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
