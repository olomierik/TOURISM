import { CardGridSkeleton } from '@/components/cards/card-skeleton';

/**
 * Shown while the directory is being built for this request.
 *
 * The route is dynamic — it reads searchParams — so every filter change and
 * every page of results is a fresh server render, measured at roughly a second.
 * Without this the browser holds the previous page, unchanged and unmarked, and
 * then replaces the whole thing at once.
 *
 * Only the results column is drawn. The filters and the heading are the parts
 * the reader was just looking at and will get back unchanged, so redrawing them
 * as grey bars would throw away the one piece of continuity they have.
 */
export default function Loading() {
  return (
    <div className="container-page pb-section pt-10">
      <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
        <div className="hidden lg:block" />
        <div>
          <div className="h-4 w-32 animate-pulse rounded bg-muted" aria-hidden />
          <CardGridSkeleton />
        </div>
      </div>
    </div>
  );
}
