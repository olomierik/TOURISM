import { cn } from '@/lib/utils';

/**
 * The shape of a business card, while the server is finding one.
 *
 * /directory and /search are server-rendered per request and each page is
 * roughly a one-second round trip — measured at 0.96-1.29s locally, and that is
 * before the network. Until now nothing filled that second: the previous page
 * simply sat there and then the whole grid swapped at once, which is the same
 * complaint that produced the pagination spinner.
 *
 * Deliberately only these two routes. Adding loading.tsx to a prerendered page
 * is cargo cult — there is no wait to cover, and the skeleton would flash on a
 * page that was already complete.
 *
 * The shimmer is a plain duration-driven animation, so the global
 * prefers-reduced-motion rule in globals.css does stop it. That is worth saying
 * because the scroll reveal in the same file needs its own guard and this one
 * does not — the difference is that animation-timeline ignores duration.
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('overflow-hidden rounded-2xl bg-card shadow-sm', className)}
      aria-hidden
    >
      <div className="aspect-[16/9] animate-pulse bg-muted" />
      <div className="p-3.5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-3 flex gap-3 border-t pt-2.5">
          <div className="h-3 w-12 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

/**
 * A grid of them, matching the directory's own three-across layout so the
 * placeholder occupies the space the results will.
 */
export function CardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
