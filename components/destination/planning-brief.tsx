import { getTranslations } from 'next-intl/server';
import { CalendarDays, Receipt, Sun } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getDestinationCosts, getSeasonality } from '@/lib/queries/taxonomy';
import { slugForMonth, monthName } from '@/lib/months';

/**
 * The three facts a reader needs before a list of businesses is useful.
 *
 * The combination pages — /activities/arusha, titled "Things to do in Arusha" —
 * were an H1, ten business cards and a call to action. They target the highest
 * volume query cluster on the site and had nothing on them that a directory
 * listing does not already have, which is exactly the thin page the product
 * brief warns against.
 *
 * Nothing here is new research. The cost bands and the 552 rows of monthly
 * conditions were already published on destination pages and already checked;
 * they simply never reached the pages that rank for "things to do in".
 *
 * Renders nothing when a destination has neither, so a city with no cost band
 * gets no empty scaffolding.
 */
export async function PlanningBrief({
  destinationId,
  destinationSlug,
  destinationName,
  locale,
}: {
  destinationId: string;
  destinationSlug: string;
  destinationName: string;
  locale: Locale;
}) {
  const [costs, months, t] = await Promise.all([
    getDestinationCosts(destinationId),
    getSeasonality(destinationId, locale),
    getTranslations({ locale, namespace: 'planningBrief' }),
  ]);

  // The month a reader is actually in. Someone reading in March wants March,
  // not a general note about the dry season.
  const now = new Date().getUTCMonth() + 1;
  const thisMonth = months.find((m) => m.month === now) ?? null;

  // The best month by the same rule the month pages rank on, so the two
  // surfaces never disagree about when to come.
  const best = [...months]
    .filter((m) => m.wildlife !== null)
    .sort((a, b) => (b.wildlife ?? 0) - (a.wildlife ?? 0) || (b.weather ?? 0) - (a.weather ?? 0))[0];

  const midrange = costs?.bands.find((b) => b.key === 'midrange');
  if (!midrange && !thisMonth) return null;

  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: costs?.currency ?? 'USD',
    maximumFractionDigits: 0,
  });

  return (
    <section className="container-page pb-section">
      <h2 className="font-display text-2xl font-semibold">
        {t('title', { name: destinationName })}
      </h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {midrange && midrange.low !== null && midrange.high !== null && (
          <div className="rounded-xl border p-5">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Receipt className="size-3.5" aria-hidden />
              {t('costLabel')}
            </p>
            <p className="mt-2 font-display text-xl font-semibold tabular-nums">
              {money.format(midrange.low)} – {money.format(midrange.high)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t('costNote')}</p>
          </div>
        )}

        {thisMonth && (
          <div className="rounded-xl border p-5">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Sun className="size-3.5" aria-hidden />
              {t('nowLabel', { month: monthName(now, locale) })}
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              {thisMonth.highlight ?? t('noNote')}
            </p>
          </div>
        )}

        {best && (
          <div className="rounded-xl border p-5">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden />
              {t('bestLabel')}
            </p>
            <p className="mt-2 font-display text-xl font-semibold">
              {monthName(best.month, locale)}
            </p>
            <Link
              href={{
                pathname: '/when-to-go/[month]',
                params: { month: slugForMonth(best.month, locale) },
              }}
              className="mt-1 inline-block text-sm text-primary underline-offset-2 hover:underline"
            >
              {t('compareMonths')}
            </Link>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm">
        <Link
          href={{ pathname: '/destinations/[slug]', params: { slug: destinationSlug } }}
          className="text-primary underline-offset-2 hover:underline"
        >
          {t('fullGuide', { name: destinationName })}
        </Link>
      </p>
    </section>
  );
}
