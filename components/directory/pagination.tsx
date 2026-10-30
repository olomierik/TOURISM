import { getTranslations } from 'next-intl/server';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Pagination — design.md §6.8.
 *
 * "Prev · 1 2 3 … 109 · Next, with 44 px targets and nav aria-label
 * 'Pagination', plus a 'Showing 1–24 of 2,618' body-sm line. Show 24 per page.
 * Every page has its own crawlable URL (?page=2)."
 *
 * The numbers are the change. A Prev/Next pair is two links; this directory has
 * 109 pages, and with only Prev/Next the 109th is 108 clicks from the first and
 * no crawler will ever reach it. Numbered links put the last page one click
 * away and give the index a path to every page in between.
 *
 * "Showing 1–24 of 2,618" is the other half, and it is the line that makes
 * pagination legible at all: without it, page 5 of a filtered result is a
 * screen of listings with no indication of where it sits or how much is left.
 *
 * Rendered as server-side `<Link>`s rather than buttons, so each page really is
 * its own URL — shareable, bookmarkable and crawlable, which is what §13 needs
 * from the product's largest surface.
 */

/** §6.8: 24 per page. */
export const PER_PAGE = 24;

/**
 * Which page numbers to draw: always the first and last, the current and its
 * neighbours, and an ellipsis where a run is skipped.
 *
 * Returns a fixed shape rather than a variable-width window, so the control
 * does not change size as you page through it — a row of links that reflows
 * under the cursor is how you click the wrong page.
 */
export function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const out: (number | 'gap')[] = [1];
  const start = Math.max(2, Math.min(page - 1, totalPages - 4));
  const end = Math.min(totalPages - 1, Math.max(page + 1, 5));

  if (start > 2) out.push('gap');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < totalPages - 1) out.push('gap');
  out.push(totalPages);
  return out;
}

export async function Pagination({
  page,
  totalPages,
  total,
  perPage = PER_PAGE,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  total: number;
  perPage?: number;
  /** Builds the typed href for a page number, so the caller owns the route. */
  hrefFor: (page: number) => React.ComponentProps<typeof Link>['href'];
}) {
  const t = await getTranslations('directory');
  if (totalPages <= 1) return null;

  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const pages = pageWindow(page, totalPages);

  // 44px targets throughout (§6.8). `tabular-nums` so the digits do not shift
  // the row's width between 9 and 10.
  const cell =
    // Narrower on a phone so the whole row stays on one line (it wrapped at 390px).
    'inline-flex h-10 min-w-9 items-center justify-center rounded-sm px-2 text-body-sm font-semibold tabular-nums sm:h-11 sm:min-w-11 sm:px-3';

  return (
    <div className="mt-6 flex flex-col items-center gap-2 sm:mt-10 sm:gap-3">
      <nav aria-label={t('pagination')}>
        <ul className="flex flex-wrap items-center justify-center gap-0.5 sm:gap-1">
          <li>
            {page > 1 ? (
              <Link href={hrefFor(page - 1)} rel="prev" className={cn(cell, 'hover:bg-secondary')}>
                <ChevronLeft className="size-4" aria-hidden />
                <span className="max-sm:sr-only">{t('previous')}</span>
              </Link>
            ) : (
              <span className={cn(cell, 'text-muted-foreground opacity-40')} aria-hidden>
                <ChevronLeft className="size-4" />
                <span className="max-sm:sr-only">{t('previous')}</span>
              </span>
            )}
          </li>

          {pages.map((p, i) =>
            p === 'gap' ? (
              <li key={`gap-${i}`} aria-hidden className={cn(cell, 'text-muted-foreground')}>
                {'…'}
              </li>
            ) : (
              <li key={p}>
                <Link
                  href={hrefFor(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={cn(
                    cell,
                    p === page
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-secondary',
                  )}
                >
                  {p}
                </Link>
              </li>
            ),
          )}

          <li>
            {page < totalPages ? (
              <Link href={hrefFor(page + 1)} rel="next" className={cn(cell, 'hover:bg-secondary')}>
                <span className="max-sm:sr-only">{t('next')}</span>
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            ) : (
              <span className={cn(cell, 'text-muted-foreground opacity-40')} aria-hidden>
                <span className="max-sm:sr-only">{t('next')}</span>
                <ChevronRight className="size-4" />
              </span>
            )}
          </li>
        </ul>
      </nav>

      <p className="text-body-sm tabular-nums text-muted-foreground">
        {t('showingRange', { from, to, total })}
      </p>
    </div>
  );
}
