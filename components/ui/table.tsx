import { cn } from '@/lib/utils';

/**
 * A data table, styled once.
 *
 * Eight files were writing their own — four variants of the wrapper alone
 * (`w-full text-sm`, `w-full min-w-[46rem] text-sm`, one with
 * `border-collapse`, one with `border-separate`) and each with its own header
 * row treatment. Admin leads, admin payments, the comparison page and the
 * destination cost tables all looked slightly different from each other for no
 * reason anybody decided.
 *
 * The wrapper matters as much as the table.
 *
 * A table of eight columns cannot reflow onto a 390px phone, and the honest
 * answer is to let it scroll inside its own box rather than let it push the
 * whole page sideways. `TableScroll` is that box, and it is not optional — it
 * carries the `min-width` that keeps columns readable and the `overflow-x-auto`
 * that stops the document scrolling. Every table on this site is wrapped in one.
 */
export function TableScroll({
  children,
  className,
  minWidth = '46rem',
}: {
  children: React.ReactNode;
  className?: string;
  /** Below this the table scrolls rather than squeezing its columns. */
  minWidth?: string;
}) {
  return (
    <div className={cn('-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full text-sm', className)} {...props} />;
}

/**
 * Small, tracked capitals on a rule. Loud enough to separate the header from
 * the body, quiet enough that the data is what the eye lands on.
 */
export function TableHead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'border-b text-left text-xs uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y', className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors hover:bg-muted/60', className)} {...props} />;
}

/** Always give a `scope` — it is what makes a table navigable by screen reader. */
export function TableHeader({
  className,
  scope = 'col',
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope={scope} className={cn('py-3 pr-4 font-medium', className)} {...props} />;
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('py-3 pr-4 align-top', className)} {...props} />;
}

/**
 * Figures line up in columns or they are hard to compare, which is most of why
 * a table exists. Apply to any cell holding a number, a price or a count.
 */
export function TableNum({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <TableCell className={cn('tabular-nums', className)} {...props} />;
}
