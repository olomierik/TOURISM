import { ChevronRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Href = React.ComponentProps<typeof Link>['href'];

/**
 * A hairline-separated list, for content that a card was oversizing.
 *
 * Measured before this existed: the homepage's six category links occupied
 * 534px and its four events 494px, because both were drawn as `rounded-2xl
 * border bg-card p-5` cards wrapped around a 44px filled icon tile, a title and
 * one line of description. A card frames a photograph; there was no photograph.
 * The border, the fill, the shadow and the padding were 40px per item of chrome
 * holding nothing.
 *
 * So: no border, no fill, no shadow. A 1px rule between items, which is the
 * least mark that still says "these are separate things", and the space goes
 * back to the page.
 *
 * The idiom is not new here — `app/[locale]/events/page.tsx` already renders
 * its agenda as `<ul className="divide-y">` with `<li className="py-4">`, and
 * five other files do the same by hand. This is that pattern given a name, the
 * way Table, Select and Tabs were.
 */
export function RowList({
  children,
  columns = 1,
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement> & {
  /**
   * Rows are wide and short, so a list of six wants columns where a list of
   * six cards wanted a grid. Two or three columns turn a 340px stack into a
   * 120px block without making any single row harder to read.
   *
   * The grid goes on the `<ul>` and the rule goes on each `<li>`, rather than
   * the tidier-looking `display: contents` on the list with `divide-y` — that
   * drops the list from the accessibility tree in some browsers, and a
   * `divide-y` cannot see children it no longer boxes.
   */
  columns?: 1 | 2 | 3;
}) {
  return (
    <ul
      className={cn(
        columns === 1
          ? 'divide-y border-y'
          : 'grid gap-x-10 border-t sm:grid-cols-2 [&>li]:border-b',
        columns === 3 && 'lg:grid-cols-3',
        className,
      )}
      {...props}
    >
      {children}
    </ul>
  );
}

/**
 * One row.
 *
 * `href` is optional because not every list is navigable — a run of statistics
 * is a RowList too, and making those links would promise a destination that
 * does not exist. When it is present the whole row is the target, which is a
 * far larger tap area than the title alone ever was inside the old card.
 *
 * The glyph is drawn bare rather than in a filled tile. A 44px tile around a
 * 20px icon is 24px of decoration per row, and at six rows that is more than
 * the height of a row.
 */
export function Row({
  href,
  icon,
  title,
  meta,
  description,
  className,
}: {
  href?: Href;
  /** Rendered at `size-4` in muted ink; pass the icon element, not a component. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  /** Sits hard right of the title — a count, a month, a status. */
  meta?: React.ReactNode;
  /** Clamped to one line. A row that wraps to three is a card again. */
  description?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span
            className="shrink-0 text-muted-foreground transition-colors group-hover:text-primary [&>svg]:size-4"
            aria-hidden
          >
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate font-medium group-hover:text-primary">
          {title}
        </span>
        {meta && (
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{meta}</span>
        )}
        {href && (
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        )}
      </div>
      {description && (
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{description}</p>
      )}
    </>
  );

  return (
    <li>
      {href ? (
        <Link
          href={href}
          className={cn(
            'group block py-3 transition-colors hover:bg-muted/50',
            // The hover fill runs to the edge of the reading column rather than
            // stopping at the text, which is what makes a bare row still feel
            // like a target.
            '-mx-3 px-3',
            className,
          )}
        >
          {body}
        </Link>
      ) : (
        <div className={cn('group py-3', className)}>{body}</div>
      )}
    </li>
  );
}
