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
      className={cn('scroll-mt-[calc(var(--header-h)+1rem)]', muted && 'bg-muted/40', className)}
    >
      <div className="container-page py-section">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold sm:text-4xl">{title}</h2>
            {subtitle && (
              <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{subtitle}</p>
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

        <div className="mt-10">{children}</div>

        {viewAllHref && viewAllLabel && (
          <div className="mt-8 sm:hidden">
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
