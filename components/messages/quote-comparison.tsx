import { getTranslations } from 'next-intl/server';
import { BadgeCheck, Star } from 'lucide-react';

import type { EnquiryThreads } from '@/lib/queries/enquiry-thread';
import { formatMoney } from '@/lib/leads/quote-types';
import { isTopRated } from '@/lib/badges';
import { cn } from '@/lib/utils';

/**
 * Every operator's quote for one enquiry, side by side, cheapest first, the
 * way a traveller actually decides: price, then what it covers, then who is
 * behind it. Each column links down to that operator's conversation.
 *
 * Prices are compared within a currency only; quotes in another currency
 * follow, never converted (a rate we pick would be a number nobody quoted).
 */
export async function QuoteComparison({
  threads,
  locale,
}: {
  threads: EnquiryThreads['threads'];
  locale: string;
}) {
  const quoted = threads.filter((th) => th.quote);
  if (quoted.length === 0) return null;
  const t = await getTranslations('quoteCompare');

  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...quoted].sort((a, b) => {
    const qa = a.quote!;
    const qb = b.quote!;
    if (qa.currency !== qb.currency) return qa.currency.localeCompare(qb.currency);
    return qa.totalAmount - qb.totalAmount;
  });
  const cheapest = sorted[0].quote!;

  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });

  return (
    <section id="quotes" className="mt-8 scroll-mt-[calc(var(--header-h)+1rem)]">
      <h2 className="text-xl font-semibold">{t('title', { count: quoted.length })}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>

      <div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-2">
        {sorted.map((th) => {
          const q = th.quote!;
          const expired = q.validUntil !== null && q.validUntil < today;
          const best = q === cheapest && sorted.length > 1;
          return (
            <article
              key={th.id}
              className={cn(
                'flex w-[17rem] shrink-0 snap-start flex-col rounded-2xl border bg-card p-4 shadow-sm',
                best && 'border-success ring-1 ring-success/40',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-snug">{th.business.name}</h3>
                {best && (
                  <span className="shrink-0 rounded-full bg-success/12 px-2 py-0.5 text-xs font-medium text-success">
                    {t('lowest')}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {th.business.ratingCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="size-3.5 fill-warning text-warning" aria-hidden />
                    <span className="font-medium text-foreground">{th.business.ratingAvg.toFixed(1)}</span>(
                    {th.business.ratingCount})
                  </span>
                )}
                {th.business.isVerified && (
                  <span className="flex items-center gap-1 text-success">
                    <BadgeCheck className="size-3.5" aria-hidden />
                    {t('verified')}
                  </span>
                )}
                {isTopRated(th.business.ratingAvg, th.business.ratingCount) && <span>{t('topRated')}</span>}
              </div>

              <p className="mt-3 text-2xl font-bold tabular-nums">{formatMoney(q.totalAmount, q.currency, locale)}</p>
              <p className="text-xs text-muted-foreground">
                {q.priceBasis === 'per_person' ? t('perPerson') : t('total')}
                {q.durationDays ? ` · ${t('days', { count: q.durationDays })}` : ''}
              </p>
              {q.validUntil && (
                <p className={cn('mt-1 text-xs', expired ? 'text-destructive' : 'text-muted-foreground')}>
                  {expired
                    ? t('expired', { date: dateFmt.format(new Date(q.validUntil)) })
                    : t('validUntil', { date: dateFmt.format(new Date(q.validUntil)) })}
                </p>
              )}

              <dl className="mt-3 flex-1 space-y-2 text-sm">
                {q.includes && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('includes')}</dt>
                    <dd className="mt-0.5 whitespace-pre-line">{q.includes}</dd>
                  </div>
                )}
                {q.excludes && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('excludes')}</dt>
                    <dd className="mt-0.5 whitespace-pre-line">{q.excludes}</dd>
                  </div>
                )}
                {q.notes && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('notes')}</dt>
                    <dd className="mt-0.5 whitespace-pre-line text-muted-foreground">{q.notes}</dd>
                  </div>
                )}
              </dl>

              <a
                href={`#thread-${th.id}`}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full border text-sm font-semibold hover:bg-secondary"
              >
                {t('reply', { name: th.business.name })}
              </a>
            </article>
          );
        })}
      </div>
      {threads.length > quoted.length && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t('waiting', { count: threads.length - quoted.length })}
        </p>
      )}
    </section>
  );
}
