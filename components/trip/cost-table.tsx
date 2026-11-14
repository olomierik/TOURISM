import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import type { CostableDestination } from '@/lib/queries/taxonomy';

/**
 * The published figures, as a table the server renders.
 *
 * This page exists to answer "what does a Tanzania safari cost?" — the query
 * that brings more impressions than any other, 281 in three months, at an
 * average position of 81. It was losing them for a reason that had nothing to
 * do with the writing: every number was inside the estimator, the estimator is
 * a client component behind a Suspense boundary whose fallback is an empty
 * div, and so the page a crawler received held 207 words and no prices at all.
 * A page that answers the question only after JavaScript runs is a page that
 * does not answer it.
 *
 * So the same figures are rendered here as ordinary HTML, on the server, from
 * the same query the estimator already reads. The estimator stays: it does the
 * arithmetic for a specific trip, which is the part worth interacting with.
 * This is the part worth indexing, and it is useful in its own right — most
 * people asking the question want a sense of the range before they build
 * anything.
 *
 * Figures are per person per night, which is the unit the data holds and the
 * unit the comparison sites publish. Park fees are shown in their own column
 * rather than folded into the ranges because they are the one number nobody
 * can discount: it is what makes a suspiciously cheap quote suspicious, and
 * `floor` in the copy below says so.
 */
export async function CostTable({
  destinations,
  locale,
}: {
  destinations: CostableDestination[];
  locale: Locale;
}) {
  const [t, tNav] = await Promise.all([
    getTranslations({ locale, namespace: 'tripCost' }),
    getTranslations({ locale, namespace: 'nav' }),
  ]);

  // Priced destinations only, cheapest first. A reader scanning for "what is
  // the least this can cost" gets an answer in the first row, and the ordering
  // doubles as the honest headline: the range starts here, not at the average.
  const rows = destinations
    .filter((d) => d.costs.budgetLow !== null || d.costs.midrangeLow !== null)
    .sort((a, b) => (a.costs.budgetLow ?? Infinity) - (b.costs.budgetLow ?? Infinity));

  if (!rows.length) return null;

  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: rows[0].costs.currency,
    maximumFractionDigits: 0,
  });

  /** A low–high pair, or the "no figures" marker when the row has neither. */
  const range = (low: number | null, high: number | null) => {
    if (low === null && high === null) return t('noFigures');
    if (low !== null && high !== null && low !== high) {
      return `${money.format(low)}–${money.format(high)}`;
    }
    return money.format((low ?? high) as number);
  };

  // `feesAsOf` is already a year, not a date. The newest one across the table,
  // so the note under it cannot claim figures are fresher than the oldest row
  // — it says which year the rates were checked for, and the latest is the
  // only honest answer when they were checked at different times.
  const asOfYear = rows.map((d) => d.costs.feesAsOf).filter(Boolean).sort((a, b) => b - a)[0];

  return (
    <section aria-labelledby="cost-table" className="mt-12">
      <h2 id="cost-table" className="font-display text-heading-lg font-semibold">
        {t('tableTitle')}
      </h2>
      <p className="mt-2 max-w-3xl text-body-sm text-muted-foreground">{t('perNight')}</p>

      {/* Its own scroll container: five columns of currency do not fit a phone,
          and letting the page scroll sideways instead would move the whole
          layout rather than the one thing that is too wide. */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-body-sm">
          <thead>
            <tr className="border-b text-left">
              <th scope="col" className="py-2.5 pr-4 font-semibold">
                {tNav('destinations')}
              </th>
              <th scope="col" className="py-2.5 pr-4 text-right font-semibold">
                {t('style.budget')}
              </th>
              <th scope="col" className="py-2.5 pr-4 text-right font-semibold">
                {t('style.midrange')}
              </th>
              <th scope="col" className="py-2.5 pr-4 text-right font-semibold">
                {t('style.luxury')}
              </th>
              <th scope="col" className="py-2.5 text-right font-semibold">
                {t('parkFees')}
              </th>
            </tr>
          </thead>
          <tbody className="lining-nums tabular-nums">
            {rows.map((d) => (
              <tr key={d.id} className="border-b last:border-0">
                <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                  {/* Plain anchor, not next/link: the destination page is the
                      conversion step — it carries the operators — and this is a
                      server component, so a crawler follows it either way. */}
                  <a
                    href={`/${locale === 'en' ? '' : `${locale}/`}destinations/${d.slug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {d.name}
                  </a>
                </th>
                <td className="py-2.5 pr-4 text-right">
                  {range(d.costs.budgetLow, d.costs.budgetHigh)}
                </td>
                <td className="py-2.5 pr-4 text-right">
                  {range(d.costs.midrangeLow, d.costs.midrangeHigh)}
                </td>
                <td className="py-2.5 pr-4 text-right">
                  {range(d.costs.luxuryLow, d.costs.luxuryHigh)}
                </td>
                <td className="py-2.5 text-right">
                  {range(d.costs.parkFeeLow, d.costs.parkFeeHigh)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {asOfYear ? (
        <p className="mt-3 text-body-sm text-muted-foreground">{t('asOf', { year: asOfYear })}</p>
      ) : null}
      <p className="mt-2 max-w-3xl text-body-sm text-muted-foreground">{t('excludes')}</p>
    </section>
  );
}
