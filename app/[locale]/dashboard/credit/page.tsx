import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';

import { redirect } from '@/i18n/navigation';
import type { LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { getMyBusiness } from '@/lib/queries/dashboard';
import { activeProvider } from '@/lib/payments/provider';
import { CREDIT_TOP_UPS, getLeadPricing } from '@/lib/leads/pricing';
import { RATE_MARKUP_PERCENT } from '@/lib/pricing/markup';
import { LeadSettingsForm, TopUpButtons } from '@/components/dashboard/credit-forms';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatPrice } from '@/lib/format';

/**
 * Enquiry credit: what an operator holds, how to add to it, what they bid,
 * and where it went. Migration 089 explains the model.
 *
 * The ranking rule is stated here in full rather than summarised, because
 * money is one of its inputs. An operator deciding how much to bid is owed
 * the formula, and the published formula is what keeps a paid ranking from
 * being a rigged one.
 */
export default async function DashboardCreditPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const business = await getMyBusiness(locale);
  if (!business) return redirect({ href: '/dashboard', locale });

  const supabase = await createClient();
  const [t, format, pricing, provider, ledger] = await Promise.all([
    getTranslations('leadCredit'),
    getFormatter(),
    getLeadPricing(),
    activeProvider(),
    supabase
      .from('lead_credit_ledger')
      .select('id, amount, currency, kind, note, created_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false }),
  ]);

  const rows = ledger.data ?? [];
  const balance = rows.reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      <h2 className="sr-only">{t('title')}</h2>

      {!pricing.enabled && (
        <Alert variant="info">
          <AlertDescription>{t('notLiveYet')}</AlertDescription>
        </Alert>
      )}

      <section className="rounded-2xl border bg-card p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('balanceLabel')}</p>
        <p className="mt-1 font-display text-4xl font-semibold tabular-nums">{formatPrice(balance, 'USD', locale)}</p>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">{t('balanceHint')}</p>
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium">{t('topUpLabel')}</p>
          <TopUpButtons amounts={CREDIT_TOP_UPS} available={provider === 'paddle'} />
          <p className="mt-2 text-xs text-muted-foreground">{t('topUpTerms')}</p>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h3 className="font-display text-lg font-semibold">{t('settingsTitle')}</h3>
        <div className="mt-4">
          <LeadSettingsForm
            bid={business.lead_bid_percent === null ? null : Number(business.lead_bid_percent)}
            optOut={business.rate_markup_opt_out}
            min={pricing.percentMin}
            max={pricing.percentMax}
            defaultPercent={pricing.percentDefault}
            feeMin={pricing.feeMin}
            feeMax={pricing.feeMax}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h3 className="font-display text-lg font-semibold">{t('howTitle')}</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground marker:font-semibold marker:text-foreground">
          <li>{t('how1')}</li>
          <li>{t('how2')}</li>
          <li>{t('how3')}</li>
          <li>{t('how4')}</li>
        </ol>
        <h4 className="mt-5 text-sm font-semibold">{t('rankingTitle')}</h4>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('rankingBody')}</p>
        <h4 className="mt-5 text-sm font-semibold">{t('markupTitle', { percent: RATE_MARKUP_PERCENT })}</h4>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {t('markupBody', { percent: RATE_MARKUP_PERCENT })}
        </p>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h3 className="font-display text-lg font-semibold">{t('historyTitle')}</h3>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('historyEmpty')}</p>
        ) : (
          <ul className="mt-3 divide-y">
            {rows.map((r) => {
              const amount = Number(r.amount);
              return (
                <li key={r.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block">{t(`kind_${r.kind as 'topup'}`)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {format.dateTime(new Date(r.created_at), { dateStyle: 'medium' })}
                      {r.note ? ` · ${r.note}` : ''}
                    </span>
                  </span>
                  <span className={amount < 0 ? 'tabular-nums' : 'font-semibold tabular-nums text-success'}>
                    {amount > 0 ? '+' : ''}
                    {formatPrice(amount, r.currency, locale)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
