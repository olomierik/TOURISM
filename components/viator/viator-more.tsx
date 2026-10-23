import { getTranslations } from 'next-intl/server';
import { ArrowUpRight, Ticket } from 'lucide-react';

import { viatorEnabled, viatorSearchUrl } from '@/lib/viator';
import { cn } from '@/lib/utils';

/**
 * "More tours on Viator": one partner link for a place, below what local
 * operators offer, never in place of it.
 *
 * Marked as a partner link where it stands, and rel="sponsored" for search
 * engines, as Google asks of paid links. Renders nothing until a partner ID is
 * configured (lib/viator.ts).
 */
export async function ViatorMore({
  place,
  className,
}: {
  /** The place as a traveller would search it, e.g. "Serengeti". */
  place: string;
  className?: string;
}) {
  if (!viatorEnabled) return null;
  const t = await getTranslations('viator');

  return (
    <aside
      className={cn(
        'flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center',
        className,
      )}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
        <Ticket className="size-5 text-primary" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold">{t('title', { place })}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('body')}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">{t('disclosure')}</p>
      </div>
      <a
        href={viatorSearchUrl(`${place}, Tanzania`)}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border px-5 text-sm font-semibold transition-colors hover:bg-secondary"
      >
        {t('cta')}
        <ArrowUpRight className="size-4" aria-hidden />
      </a>
    </aside>
  );
}
