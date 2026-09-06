import { cn } from '@/lib/utils';

/**
 * A grey block that stands where content will be.
 *
 * Generic on purpose: `components/cards/card-skeleton.tsx` composes this into
 * the directory's card shape, and anything else that needs a placeholder —
 * a table row, a dashboard figure, a form — should compose it too rather than
 * writing `animate-pulse bg-muted` again.
 *
 * The pulse is a plain duration-driven animation, so the global
 * prefers-reduced-motion rule in globals.css stops it. Worth knowing that the
 * scroll reveal in the same file needs its own guard and this does not: the
 * difference is that animation-timeline ignores animation-duration, and this
 * has no timeline.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

/** A run of lines, for paragraphs. The last is short, the way real text ends. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 && 'w-3/5')} />
      ))}
    </div>
  );
}
