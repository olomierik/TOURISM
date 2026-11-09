import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Check, Minus, ShieldCheck, Store, TrendingUp } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyBusiness } from '@/lib/queries/dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { BankTransferButton } from '@/components/billing/bank-transfer-button';
import { CheckoutButton } from '@/components/dashboard/checkout-button';
import { StartTrialButton } from '@/components/billing/start-trial-button';

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  return { title: t('subscription'), robots: { index: false, follow: false } };
}

export default async function SubscriptionPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.subscriptionPage');
  const tTrial = await getTranslations('dashboard.trial');
  const business = await getMyBusiness(locale);

  if (!business) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <Store className="size-5 text-primary" aria-hidden />
        </div>
        <h2 className="mt-6 text-2xl font-semibold">{t('noBusinessTitle')}</h2>
        <Button asChild className="mt-6">
          <Link href="/dashboard">{t('noBusinessCta')}</Link>
        </Button>
      </div>
    );
  }

  const supabase = await createClient();

  // Enquiries received this calendar month, counted exactly the way
  // `business_has_lead_capacity` counts them (migration 012): rows in
  // lead_businesses since the start of the month. Using the same window
  // matters — a figure here that disagreed with the guard would tell an
  // operator they have room on the very enquiry that is about to be refused.
  //
  // What this deliberately does not do is claim lost leads. The matcher skips
  // a business with no capacity, so no row is written for an enquiry that
  // never arrived, and "you missed 7 travellers" would be a number nobody can
  // measure. Usage against the cap is a fact; the inference is the operator's
  // to draw.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: plans }, { data: current }, { count: leadsThisMonth }] = await Promise.all([
    supabase
      .from('subscription_plans')
      .select(
        `id, key, tier, price_yearly, currency,
         max_packages, max_gallery_images, max_services, monthly_lead_quota,
         can_be_featured, has_analytics,
         subscription_plan_translations (locale, name, description)`,
      )
      .eq('is_active', true)
      .order('price_yearly'),
    supabase
      .from('subscriptions')
      .select('plan_id, status, current_period_start, current_period_end, is_trial')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('lead_businesses')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('sent_at', monthStart.toISOString()),
  ]);

  // The hourly job (migration 061) marks a finished period expired; until it
  // runs, a period that has ended is treated as ended here too, so the page
  // never shows a plan for up to an hour after it lapsed.
  const live =
    current && (!current.current_period_end || new Date(current.current_period_end) > new Date())
      ? current
      : null;
  const onTrial = Boolean(live?.is_trial);

  // One trial per listing, for a live listing with no paid plan running.
  const { data: trialRow } = await supabase
    .from('businesses')
    .select('trial_started_at')
    .eq('id', business.id)
    .maybeSingle();
  const livePlanIsPaid = Boolean(
    live && (plans ?? []).find((p) => p.id === live.plan_id && p.key !== 'free'),
  );
  const canStartTrial =
    business.status === 'approved' && !trialRow?.trial_started_at && !livePlanIsPaid;
  const premium = (plans ?? []).find((p) => p.key === 'premium');

  // No active subscription is the normal state for a new listing, not an error.
  const activePlanId = live?.plan_id ?? plans?.find((p) => p.key === 'free')?.id ?? null;

  // How much of the year is left.
  //
  // The row has carried current_period_end since the first billing migration
  // and nothing ever showed it, so an operator who paid for a year had no way
  // to see when it ends or how much of it they had used — the one fact they
  // are most likely to want from this page.
  //
  // Counted in whole days from midnight rather than from the exact instant, so
  // the number changes once a day at a predictable time instead of ticking
  // down mid-afternoon. A period that has run out reads as 0, never negative.
  const activePlan = live?.plan_id
    ? (plans ?? []).find((p) => p.id === live.plan_id)
    : null;

  const periodEnd = live?.current_period_end ? new Date(live.current_period_end) : null;
  const periodStart = live?.current_period_start
    ? new Date(live.current_period_start)
    : null;

  const longDate = (d: Date) =>
    d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const premiumPrice = premium
    ? `${premium.currency} ${Number(premium.price_yearly ?? 0).toFixed(0)}`
    : null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const DAY = 24 * 60 * 60 * 1000;
  // Calendar days from today to the day it ends. Measuring from midnight to the
  // exact end instant and rounding up said "31 days left" on the day a 30-day
  // trial started.
  const endDay = periodEnd ? new Date(periodEnd) : null;
  endDay?.setHours(0, 0, 0, 0);
  const daysLeft = endDay
    ? Math.max(0, Math.round((endDay.getTime() - startOfToday.getTime()) / DAY))
    : null;
  const daysTotal =
    periodEnd && periodStart
      ? Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / DAY))
      : null;

  // The plan actually in force, which is the free one when nothing is active.
  // `activePlan` is null in that case and the cap still applies — migration
  // 012 falls back to the free allowance for a business with no subscription
  // row, so this has to fall back the same way or the 5 owned listings that
  // hold no subscription would be shown no limit at all.
  const effectivePlan = (plans ?? []).find((p) => p.id === activePlanId) ?? null;
  const quota = effectivePlan?.monthly_lead_quota ?? null;
  const used = leadsThisMonth ?? 0;
  const atCap = quota !== null && used >= quota;
  const premiumQuota = premium?.monthly_lead_quota ?? null;

  const activePlanName = activePlan
    ? (activePlan.subscription_plan_translations.find((x) => x.locale === locale)
        ?? activePlan.subscription_plan_translations.find((x) => x.locale === 'en'))?.name
    : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('subtitle')}</p>
      </header>

      {/* Payment is a bank transfer, and the thing an operator most needs to
          know before pressing anything is that nothing happens automatically.
          A person matches the transfer against the bank statement. Saying so
          here stops the email that otherwise arrives an hour later asking why
          the plan has not upgraded. */}
      {/* The countdown, above the plan cards, because "how long have I got"
          is the question an operator opens this page with once they have
          already chosen a plan. Only rendered for a paid period: a free
          listing has no clock and a bar reading 0 would invent an anxiety. */}
      {daysLeft !== null && periodEnd && activePlanName && (
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div>
              <p className="text-sm text-muted-foreground">
                {onTrial ? tTrial('label') : t('currentPlan')}
              </p>
              <p className="mt-1 font-display text-xl font-semibold">{activePlanName}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-semibold tabular-nums">
                {t('daysLeft', { days: daysLeft })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('until', {
                  date: periodEnd.toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }),
                })}
              </p>
            </div>
          </div>

          {daysTotal !== null && (
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={daysLeft}
              aria-valuemin={0}
              aria-valuemax={daysTotal}
              aria-label={t('daysLeft', { days: daysLeft })}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-[width]',
                  daysLeft <= 30 ? 'bg-warning' : 'bg-accent',
                )}
                style={{ width: `${Math.min(100, (daysLeft / daysTotal) * 100)}%` }}
              />
            </div>
          )}

          {/* A trial says exactly what happens at the end, in one place: the
              date, that the listing stays, and the price of keeping Premium.
              Nothing renews by itself, so there is no "you will be charged". */}
          {onTrial ? (
            <p className="mt-3 text-sm">
              {tTrial('endsNotice', { date: longDate(periodEnd), price: premiumPrice ?? '' })}
            </p>
          ) : (
            daysLeft <= 30 && (
              <p className="mt-3 text-sm font-medium">{t('expiringSoon', { days: daysLeft })}</p>
            )
          )}
        </div>
      )}

      {canStartTrial && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <h2 className="font-display text-xl font-semibold">{tTrial('offerTitle')}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {tTrial('offerBody', { price: premiumPrice ?? '' })}
          </p>
          <div className="mt-4">
            <StartTrialButton />
          </div>
        </div>
      )}

      {/* Why upgrade, argued with the operator's own numbers.

          Rendered only once at least one enquiry has arrived this month. At
          zero the honest version reads "0 of 2 used", which is an argument
          against paying, and dressing that up as an argument for paying would
          mean inventing a figure. An operator with no enquiries needs a better
          listing, not a bigger cap.

          At the cap it says what is actually happening: the matcher skips a
          business with no capacity, so those enquiries are going to other
          operators. That is a description of migration 012, not a sales
          line. */}
      {used > 0 && quota !== null && (
        <div
          className={cn(
            'rounded-2xl border p-5',
            atCap ? 'border-warning/40 bg-warning/5' : 'bg-card',
          )}
        >
          <div className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium">{t('usageTitle', { used, quota })}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {atCap
                  ? premiumQuota === null
                    ? t('usageAtCapUnlimited')
                    : t('usageAtCap', { premiumQuota })
                  : t('usageBelowCap', { left: quota - used })}
              </p>
            </div>
          </div>

          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={used}
            aria-valuemin={0}
            aria-valuemax={quota}
            aria-label={t('usageTitle', { used, quota })}
          >
            <div
              className={cn('h-full rounded-full', atCap ? 'bg-warning' : 'bg-accent')}
              style={{ width: `${Math.min(100, (used / quota) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <Alert>
        <AlertDescription>{t('paymentNotice')}</AlertDescription>
      </Alert>

      <ul className="grid gap-5 lg:grid-cols-3">
        {(plans ?? []).map((plan) => {
          const tr = plan.subscription_plan_translations.find((x) => x.locale === locale)
            ?? plan.subscription_plan_translations.find((x) => x.locale === 'en');
          const isCurrent = plan.id === activePlanId;

          // Every card shows the same rows in the same order, including the
          // ones the plan does not have.
          //
          // A list of only what you get reads as a list of gifts. A plan is
          // defined as much by its ceiling, and an operator deciding whether
          // to pay has to see the gap rather than infer it from an absence —
          // which is impossible when the Free card simply has three fewer
          // lines than the Premium one. Unavailable rows stay in place, dashed
          // and muted.
          const isFree = Number(plan.price_yearly) === 0;

          const rows: { label: string; included: boolean }[] = [
            {
              label:
                plan.max_gallery_images === null
                  ? t('galleryUnlimited')
                  : t('gallery', { count: plan.max_gallery_images }),
              included: true,
            },
            {
              label:
                plan.max_packages === null
                  ? t('packagesUnlimited')
                  : t('packages', { count: plan.max_packages }),
              included: true,
            },
            // Services were enforced in `service-actions.ts` all along and
            // never appeared on a card, so the one cap an operator could hit
            // without warning was the one nobody advertised.
            {
              label:
                plan.max_services === null
                  ? t('servicesUnlimited')
                  : t('services', { count: plan.max_services }),
              included: true,
            },
            {
              label:
                plan.monthly_lead_quota === null
                  ? t('leadsUnlimited')
                  : t('leads', { count: plan.monthly_lead_quota }),
              included: true,
            },
            // Deals are the one genuinely paid-only feature already shipped:
            // `deals_guard` (migration 040) has always refused a deal unless
            // the active plan is a paying tier. It was never on a card.
            { label: t('deals'), included: !isFree },
            { label: t('analytics'), included: plan.has_analytics },
            // Homepage placement keys off the plan, not `can_be_featured` —
            // that column is true for Premium too, and it marks eligibility
            // for an admin boost rather than buying one. Migration 083 opens
            // the placement from the subscription itself.
            { label: t('homepage'), included: plan.key === 'featured' },
            // lead_priority (300 / 200 / 100) is read by
            // match_lead_to_businesses, so this row describes something the
            // matcher already does rather than a promise to build it.
            { label: t('leadPriority'), included: !isFree },
          ];

          return (
            <li
              key={plan.id}
              className={cn(
                'flex flex-col rounded-2xl border bg-card p-5',
                isCurrent && 'border-primary ring-1 ring-primary/30',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{tr?.name ?? plan.key}</h2>
                {isCurrent && <Badge>{t('currentPlan')}</Badge>}
              </div>

              <p className="mt-3 text-3xl font-semibold">
                {Number(plan.price_yearly) === 0
                  ? t('free')
                  : `${plan.currency} ${Number(plan.price_yearly).toFixed(0)}`}
                {Number(plan.price_yearly) > 0 && (
                  <span className="text-base font-normal text-muted-foreground">
                    {t('perYear')}
                  </span>
                )}
              </p>

              {/* No month-to-month comparison. It made sense when the annual
                  price was ten months of a real monthly rate; there is no
                  monthly alternative to compare against now, and a line
                  reading "saves $0" is worse than no line. */}
              {Number(plan.price_yearly) > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">{t('billedAnnually')}</p>
              )}

              {tr?.description && (
                <p className="mt-3 text-sm text-muted-foreground">{tr.description}</p>
              )}

              <ul className="mt-5 flex-1 space-y-2.5">
                {rows.map((r) => (
                  <li
                    key={r.label}
                    className={cn(
                      'flex items-start gap-2.5 text-sm',
                      !r.included && 'text-muted-foreground',
                    )}
                  >
                    {r.included ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    ) : (
                      <Minus className="mt-0.5 size-4 shrink-0 opacity-60" aria-hidden />
                    )}
                    {/* The icon carries the meaning visually and nothing
                        carries it for a screen reader, so the state is said in
                        words that only the reader gets. */}
                    <span className="sr-only">
                      {r.included ? t('included') : t('notIncluded')}
                    </span>
                    {r.label}
                  </li>
                ))}
              </ul>

              {/* During a trial the Premium card stays payable: subscribing
                  early keeps the remaining trial days and adds the year on top. */}
              {(!isCurrent || onTrial) && Number(plan.price_yearly) > 0 && (
                <>
                  {/* Card first, bank transfer folded behind it. Both stay: a
                      card is the fastest path for anyone who has one, and a
                      transfer is the only path for plenty of Tanzanian
                      operators who do not. Dropping the transfer to tidy the
                      card up would quietly cut off the second group. */}
                  <CheckoutButton planKey={plan.key} label={t('payNow')} />

                  <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                    {t('paddleNotice')}
                  </p>

                  <details className="mt-3 text-xs">
                    <summary className="cursor-pointer text-muted-foreground underline underline-offset-2">
                      {t('bankAlternative')}
                    </summary>
                    <BankTransferButton planKey={plan.key} label={t('subscribe')} />
                  </details>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
