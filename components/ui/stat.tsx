import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

type Href = React.ComponentProps<typeof Link>['href'];

/**
 * A figure with a label, styled once.
 *
 * Four files were writing this from scratch, in three different orderings, and
 * they had drifted in ways nobody chose: `admin/page.tsx` puts the label above
 * the value with the glyph hard right; `dashboard/page.tsx` does the same but
 * with a template literal instead of `cn`, and its second block writes two more
 * by hand at a different size; `admin/metrics.tsx` factored a local `Tile` with
 * a hint line; and `dashboard/analytics` leads with the glyph, then the value,
 * then the label — and dropped `tabular-nums` and `font-display` on the way, so
 * its figures are the only ones on the site that do not line up in a column.
 *
 * Label above value, in all of them. It is the majority already, and it is the
 * right order to read: what the number *is* before the number, so a column of
 * four is scannable by label without the eye having to land on a digit first.
 *
 * `tabular-nums` is not optional here. Figures in a grid either line up or they
 * are hard to compare, which is the entire reason a stat grid exists.
 */
export function Stat({
  label,
  value,
  hint,
  icon,
  href,
  urgent = false,
  size = 'default',
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  /** A quiet second line — "last 30 days", a delta, a denominator. */
  hint?: React.ReactNode;
  /** Rendered at `size-4`; pass the element, not the component. */
  icon?: React.ReactNode;
  /** When present the whole tile is the target. */
  href?: Href;
  /** Draws attention to a figure that needs action — a queue with items in it. */
  urgent?: boolean;
  /** 'sm' for dense grids of eight or more, as on the metrics page. */
  size?: 'default' | 'sm';
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon && (
          <span
            className={cn(
              'shrink-0 [&>svg]:size-4',
              urgent ? 'text-primary' : 'text-muted-foreground',
            )}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          'mt-1.5 font-display font-semibold tabular-nums',
          size === 'sm' ? 'text-xl' : 'text-2xl',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </>
  );

  const shell = cn(
    'rounded-xl border bg-card',
    size === 'sm' ? 'p-3.5' : 'p-4',
    urgent && 'border-primary/40 bg-primary/[0.03]',
    href && 'transition-colors hover:bg-secondary/40',
    className,
  );

  return href ? (
    <Link href={href} className={shell}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}

/**
 * The grid these sit in.
 *
 * Exists so the gap and the breakpoints are decided once. Four call sites used
 * three different combinations of `gap-3`/`gap-4` and `lg:grid-cols-3`/`-4`,
 * which is visible when two such grids appear on one page — as they do on the
 * metrics page, three times.
 */
export function StatGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-3 sm:grid-cols-2',
        columns === 3 && 'lg:grid-cols-3',
        columns === 4 && 'lg:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
