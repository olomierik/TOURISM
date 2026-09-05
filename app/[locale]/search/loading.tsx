import { CardGridSkeleton } from '@/components/cards/card-skeleton';

/**
 * Shown while a search runs.
 *
 * Same reasoning as /directory: the route reads searchParams, so it is rendered
 * per request and there is a real second to cover. A search is the one place a
 * reader is most certain they just did something, so silence there reads as a
 * broken button rather than as work in progress.
 */
export default function Loading() {
  return (
    <div className="container-page py-section">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" aria-hidden />
      <div className="mt-3 h-4 w-40 animate-pulse rounded bg-muted" aria-hidden />
      <CardGridSkeleton count={6} />
    </div>
  );
}
