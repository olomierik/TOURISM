import { getTranslations } from 'next-intl/server';
import { Info, Receipt } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { getDestinationCosts } from '@/lib/queries/taxonomy';

/**
 * What a day here costs.
 *
 * The first number a safari shopper looks for, and the site showed a price on
 * two listings out of 1,336. A directory you cannot compare prices in is a phone
 * book: the reader has no way to tell whether the quote in their inbox is
 * ordinary or absurd, which is exactly the judgement they came here to make.
 *
 * Two things carry the honesty of this section, and both cost conversions:
 *
 * The fee floor is stated separately from the day rate. Park fees are set by the
 * government and identical for every operator, so a quote below the floor is not
 * a better deal — it is a different trip, with something removed. Saying so
 * makes our own cheap listings look worse and is the single most useful thing
 * this page can tell someone.
 *
 * And the year is printed. Fees are revised annually and several are quoted
 * before VAT. A number without a date invites a reader to treat a 2026 figure as
 * a 2028 promise, and the person who finds out at the gate is not the person who
 * published it.
 */
export async function DestinationCosts({
  destinationId,
  destinationName,
  locale,
}: {
  destinationId: string;
  destinationName: string;
  locale: Locale;
}) {
  const costs = await getDestinationCosts(destinationId);
  if (!costs || costs.bands.length === 0) return null;

  const t = await getTranslations({ locale, namespace: 'destination.costs' });

  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: costs.currency,
    maximumFractionDigits: 0,
  });

  const range = (low: number | null, high: number | null) =>
    low === null || high === null ? '—' : `${money.format(low)} – ${money.format(high)}`;

  // The key arrives from the database as a free string, and next-intl's typed
  // keys will not accept one. Narrowing here means an unrecognised key drops the
  // line rather than rendering a raw "notable.somethingNew" to a reader — the
  // seed data and the messages can drift, and this decides which way it fails.
  const NOTABLE = ['craterDescent', 'gorillaPermit', 'chimpPermit', 'climbPackage', 'trekPackage'] as const;
  type NotableKey = (typeof NOTABLE)[number];
  const notableKey = NOTABLE.includes(costs.notableKey as NotableKey)
    ? (costs.notableKey as NotableKey)
    : null;

  return (
    <section className="container-page py-section">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">
          {t('title', { name: destinationName })}
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">{t('intro')}</p>

        <div className="mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <caption className="sr-only">{t('tableCaption', { name: destinationName })}</caption>
            <thead className="bg-muted/50 text-left">
              <tr>
                <th scope="col" className="p-3 font-medium">{t('style')}</th>
                <th scope="col" className="p-3 font-medium">{t('perDay')}</th>
              </tr>
            </thead>
            <tbody>
              {costs.bands.map((b) => (
                <tr key={b.key} className="border-t">
                  <th scope="row" className="p-3 text-left font-normal">{t(`band.${b.key}`)}</th>
                  <td className="p-3 font-medium tabular-nums">{range(b.low, b.high)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {costs.parkFeeLow !== null && costs.authority && (
          <div className="mt-5 flex gap-3 rounded-xl border bg-secondary/30 p-5">
            <Receipt className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="space-y-2 text-sm leading-relaxed">
              <p>
                <strong>{t('floorTitle')}</strong>{' '}
                <span className="tabular-nums">{range(costs.parkFeeLow, costs.parkFeeHigh)}</span>{' '}
                {t('floorBody', { authority: costs.authority })}
              </p>
              {notableKey && costs.notableAmount !== null && (
                <p className="text-muted-foreground">
                  {t(`notable.${notableKey}`)}:{' '}
                  <span className="font-medium tabular-nums text-foreground">
                    {money.format(costs.notableAmount)}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{t('disclaimer', { year: costs.feesAsOf })}</span>
        </p>
      </div>
    </section>
  );
}
