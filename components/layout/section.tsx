import { ArrowRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Href = React.ComponentProps<typeof Link>['href'];

/**
 * Standard section frame: eyebrow-free heading, optional subtitle, optional
 * "see all" link that collapses to the foot of the section on mobile where a
 * right-aligned header link is easy to miss.
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
}: {
  title: string;
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
      <div className="container-page py-section">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            {/* Down one step from 3xl/4xl. A section heading has to be
                clearly a heading, not compete with the page title, and at the
                old size twelve of them were most of a screen between them.
                The classes are unchanged since; the scale under them came down
                17%, so this now renders 24px rising to 30px.
                `font-display` is dropped — globals.css already applies it to
                every h1/h2/h3, so the class was a no-op here. */}
            <h2 className="flex items-center gap-4 text-2xl font-semibold sm:text-3xl">
              {title}
              {/* A rule running out from the heading to the edge of its column.
                  Every section on this site opened with a heading and nothing
                  else, so twelve of them down a page had no rhythm at all —
                  this is the cheapest mark that says a new part has started.
                  aria-hidden: it is punctuation, not content. */}
              <span aria-hidden className="h-px flex-1 bg-border" />
            </h2>
            {subtitle && (
              <p className="mt-2 leading-relaxed text-muted-foreground">{subtitle}</p>
            )}
          </div>

          {viewAllHref && viewAllLabel && (
            <Link
              href={viewAllHref}
              className="hidden items-center gap-1.5 text-sm font-medium text-primary hover:underline sm:inline-flex"
            >
              {viewAllLabel}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>

        {/* Not on the Rail itself — see the .reveal comment in globals.css.
            This wraps the section body, which scrolls vertically. */}
        <div className="reveal mt-5">{children}</div>

        {viewAllHref && viewAllLabel && (
          <div className="mt-4 sm:hidden">
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
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
