import { getTranslations } from 'next-intl/server';
import { Tag } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { createPublicClient } from '@/lib/supabase/public';

/**
 * An operator's live offer, on their listing.
 *
 * Renders nothing when there is no live deal, which is nearly always — 1,328 of
 * 1,329 listings are unclaimed and none has a subscription. That is the correct
 * behaviour rather than a placeholder: a "no current offers" box on every page
 * would be 1,329 pages of nothing.
 *
 * The row-level policy on `deals` already restricts a public read to deals that
 * have started and have not ended, so there is no date filter here — an expired
 * deal is not something this component has to remember to hide.
 *
 * The struck-through price is the operator's own published package price, read
 * live rather than copied at deal time, so it cannot drift from what the
 * package page says.
 */
export async function LiveDeal({
  businessId,
  locale,
}: {
  businessId: string;
  locale: Locale;
}) {
  const supabase = createPublicClient();

  const { data } = await supabase
    .from('deals')
    .select(
      `id, deal_price, ends_at,
       packages (price_from, currency),
       deal_translations (locale, headline, terms)`,
    )
    .eq('business_id', businessId)
    .order('ends_at', { ascending: true })
    .limit(3);

  if (!data || data.length === 0) return null;

  const t = await getTranslations({ locale, namespace: 'deals' });
  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' });

  const pick = <T extends { locale: string }>(rows: T[] | undefined) =>
    (rows ?? []).find((r) => r.locale === locale) ?? (rows ?? []).find((r) => r.locale === 'en');

  const deals = data
    .map((d) => {
      const copy = pick(d.deal_translations);
      if (!copy) return null;
      const pkg = d.packages as unknown as {
        price_from: string | null;
        currency: string;
      } | null;
      return {
        id: d.id,
        headline: copy.headline,
        terms: copy.terms,
        was: pkg?.price_from ? Number(pkg.price_from) : null,
        now: d.deal_price === null ? null : Number(d.deal_price),
        currency: pkg?.currency ?? 'USD',
        endsAt: d.ends_at,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  if (deals.length === 0) return null;

  const money = (n: number, currency: string) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <section className="container-page py-section">
      <h2 className="flex items-center gap-2 font-display text-2xl font-semibold sm:text-3xl">
        <Tag className="size-6 text-primary" aria-hidden />
        {t('title')}
      </h2>

      <ul className="mt-6 grid gap-5 lg:grid-cols-2">
        {deals.map((d) => (
          <li key={d.id} className="rounded-xl border border-primary/30 bg-secondary/30 p-5">
            <h3 className="font-display text-lg font-semibold">{d.headline}</h3>

            {d.was !== null && d.now !== null && (
              <p className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">
                  {money(d.now, d.currency)}
                </span>
                <span className="text-sm text-muted-foreground line-through tabular-nums">
                  {money(d.was, d.currency)}
                </span>
                <span className="text-sm font-medium text-primary">
                  {t('off', { percent: Math.round((1 - d.now / d.was) * 100) })}
                </span>
              </p>
            )}

            <p className="mt-3 text-sm leading-relaxed">{d.terms}</p>

            <p className="mt-3 text-xs text-muted-foreground">
              {t('until', { date: dateFmt.format(new Date(d.endsAt)) })}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        {t('disclaimer')}
      </p>
    </section>
  );
}
