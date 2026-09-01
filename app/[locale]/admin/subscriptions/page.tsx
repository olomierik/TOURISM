import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { CreditCard } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { PlanControls } from '@/components/admin/plan-controls';

/**
 * Plans and the transfers that pay for them.
 *
 * Bank transfer means nothing activates on its own. This page is where that
 * happens: pending transfers at the top with their references, so an admin can
 * hold a bank statement beside the screen and match line by line, and every
 * listing below with whatever plan it is on.
 *
 * Granting is deliberately not restricted to operators who paid. An admin can
 * put anybody on any plan — for a partner, a test, or a business that paid in
 * cash. The audit trail is the subscription row and the payment it did or did
 * not come from.
 */
export default async function AdminSubscriptionsPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const [{ data: pending }, { data: plans }, { data: businesses }, t, format] = await Promise.all([
    supabase
      .from('payments')
      .select(
        `id, amount, currency, provider_ref, created_at, business_id,
         businesses (name, slug),
         subscription_plans (id, key)`,
      )
      .eq('status', 'pending')
      .eq('provider', 'bank_transfer')
      .order('created_at', { ascending: true }),
    supabase
      .from('subscription_plans')
      .select('id, key, tier, price_yearly, currency')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('businesses')
      .select(
        `id, name, slug, tier,
         subscriptions (id, status, current_period_end, subscription_plans (key))`,
      )
      .eq('status', 'approved')
      .is('deleted_at', null)
      .not('owner_id', 'is', null)
      .order('name')
      .limit(200),
    getTranslations('admin'),
    getFormatter(),
  ]);

  const planOptions = (plans ?? []).map((p) => ({
    id: p.id,
    key: p.key,
    label: `${p.key} — ${p.currency} ${Number(p.price_yearly ?? 0).toFixed(0)}/yr`,
  }));

  const rows = (businesses ?? []).map((b) => {
    const subs = (b.subscriptions ?? []) as Array<{
      id: string;
      status: string;
      current_period_end: string | null;
      subscription_plans: { key: string } | null;
    }>;
    const active = subs.find((s) => s.status === 'active');
    return {
      id: b.id,
      name: b.name,
      tier: b.tier,
      subscriptionId: active?.id ?? null,
      planKey: active?.subscription_plans?.key ?? null,
      until: active?.current_period_end ?? null,
    };
  });

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold">{t('subscriptionsTitle')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t('subscriptionsIntro')}
        </p>
      </section>

      <section>
        <h2 className="font-medium">{t('pendingTransfers')}</h2>

        {(pending ?? []).length === 0 ? (
          <div className="mt-3 flex flex-col items-center rounded-2xl border border-dashed p-8 text-center">
            <CreditCard className="size-7 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm text-muted-foreground">{t('pendingEmpty')}</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {(pending ?? []).map((p) => {
              const biz = p.businesses as unknown as { name: string } | null;
              const plan = p.subscription_plans as unknown as { id: string; key: string } | null;
              return (
                <li key={p.id} className="rounded-2xl border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      {/* The reference first and in a monospace face: this is
                          the string being compared against a statement, and
                          that comparison is done by eye. */}
                      <p className="font-mono text-lg font-semibold">{p.provider_ref}</p>
                      <p className="mt-1 text-sm">
                        {biz?.name ?? '—'} · {plan?.key ?? '—'} ·{' '}
                        <span className="tabular-nums">
                          {p.currency} {Number(p.amount).toFixed(0)}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('raised', {
                          date: format.dateTime(new Date(p.created_at), 'medium'),
                        })}
                      </p>
                    </div>

                    {plan && p.business_id && (
                      <PlanControls
                        businessId={p.business_id}
                        planId={plan.id}
                        paymentId={p.id}
                        plans={planOptions}
                        confirmLabel={t('confirmPayment')}
                        rejectLabel={t('rejectPayment')}
                        grantLabel={t('grantPlan')}
                        mode="payment"
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-medium">{t('claimedListings')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('claimedListingsHint')}</p>

        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{r.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={r.tier === 'free' ? 'secondary' : 'verified'}>{r.tier}</Badge>
                  {r.until && (
                    <span>
                      {t('activeUntil', {
                        date: format.dateTime(new Date(r.until), 'medium'),
                      })}
                    </span>
                  )}
                </p>
              </div>

              <PlanControls
                businessId={r.id}
                subscriptionId={r.subscriptionId}
                plans={planOptions}
                grantLabel={t('grantPlan')}
                endLabel={t('endPlan')}
                mode="business"
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
