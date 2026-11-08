import { Eye, EyeOff, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * The control that lets a visitor see past the curated default.
 *
 * Three states, because there are genuinely three situations and collapsing
 * them would leave the page claiming something untrue:
 *
 *   showingAll  — they asked for everything; offer the way back.
 *   relaxed     — the default was asked for and abandoned, because this slice
 *                 of the directory had too few listings to fill a page. Saying
 *                 nothing here would be the page quietly serving a different
 *                 rule than its own control advertises.
 *   default     — the usual case; offer the rest, with the count in the label.
 *
 * The count is in the label on purpose. "Show all listings" invites the
 * question *how many am I not being shown*, and a visitor who cannot answer it
 * assumes the worst about a directory's coverage.
 *
 * A link, not a client toggle: it works without JavaScript, it can be shared
 * and bookmarked, and the back button does the obvious thing. The directory's
 * canonical already points at the unparameterised page, so the extra URL does
 * not compete with it in the index.
 */
export function ShowAllListings({
  showingAll,
  relaxed,
  hiddenCount,
  params,
  className,
}: {
  showingAll: boolean;
  relaxed?: boolean;
  /** How many approved listings the default rule is holding back. */
  hiddenCount: number;
  params: Record<string, string | string[] | undefined>;
  className?: string;
}) {
  const t = useTranslations('directory.visibility');

  const hrefFor = (all: boolean) => {
    const q: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (k === 'all' || k === 'page') continue;
      const one = Array.isArray(v) ? v[0] : v;
      if (one) q[k] = one;
    }
    if (all) q.all = '1';
    return { pathname: '/directory' as const, query: q };
  };

  if (relaxed && !showingAll) {
    return (
      <p className={cn('flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground', className)}>
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        {t('relaxed')}
      </p>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm', className)}>
      <span className="text-muted-foreground">
        {showingAll ? t('showingAll') : t('showingCurated')}
      </span>
      <Link
        href={hrefFor(!showingAll)}
        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
      >
        {showingAll ? (
          <>
            <EyeOff className="size-3.5" aria-hidden />
            {t('hideUnclaimed')}
          </>
        ) : (
          <>
            <Eye className="size-3.5" aria-hidden />
            {t('showAll', { count: hiddenCount })}
          </>
        )}
      </Link>
    </div>
  );
}
