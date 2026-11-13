import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AlertTriangle, Inbox, Send, Sparkles, Store, TrendingUp, Trophy } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link, getPathname } from '@/i18n/navigation';
import { SetupChecklist } from '@/components/dashboard/setup-checklist';
import { ListedBadge } from '@/components/dashboard/listed-badge';
import { absoluteUrl } from '@/lib/seo';
import { getMyBusiness, getDashboardStats } from '@/lib/queries/dashboard';
import { CreateBusinessForm } from '@/components/dashboard/create-business-form';
import { SubmitForReviewButton } from '@/components/dashboard/submit-for-review';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Stat, StatGrid } from '@/components/ui/stat';
import { createClient } from '@/lib/supabase/server';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/billing/enabled';
import { cn } from '@/lib/utils';

export default async function DashboardOverview({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard');
  const business = await getMyBusiness(locale);

  if (!business) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Store className="size-5 text-primary" aria-hidden />
          </div>
          <h2 className="mt-6 text-2xl font-semibold">{t('noBusinessTitle')}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {t('noBusinessBody')}
          </p>
        </div>
        {/* Most operators are already listed from licensing records. Claiming
            keeps their reviews and history; creating makes a duplicate. */}
        <div className="mb-5 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
          <h3 className="font-semibold">{t('claimFirstTitle')}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t('claimFirstBody')}</p>
          <form action={getPathname({ href: '/directory', locale })} method="get" className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              name="q"
              required
              placeholder={t('claimFirstSearch')}
              aria-label={t('claimFirstSearch')}
              className="h-11 min-w-0 flex-1 rounded-full border bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              className="h-11 shrink-0 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t('claimFirstCta')}
            </button>
          </form>
        </div>
        <div className="rounded-2xl border bg-card p-5 sm:p-8">
          <CreateBusinessForm />
        </div>
      </div>
    );
  }

  const stats = await getDashboardStats(business.id);

  // The plan band below needs the plan actually in force, which is the active
  // subscription's, not `businesses.tier`. The column is a record of something
  // that happened and disagrees with the live answer for most owned listings —
  // see lib/billing/enabled.ts. Migration 084 means an approved claimed
  // listing always has a row; a draft one legitimately has none and reads as
  // free, which is what it is.
  const supabase = await createClient();
  const { data: planRow } = SUBSCRIPTIONS_ENABLED
    ? await supabase
        .from('subscriptions')
        .select('is_trial, current_period_end, subscription_plans (key)')
        .eq('business_id', business.id)
        .eq('status', 'active')
        .maybeSingle()
    : { data: null };

  const planKey =
    (planRow?.subscription_plans as unknown as { key: string } | null)?.key ?? 'free';
  const onFreePlan = planKey === 'free';
  const planLabel =
    planKey === 'featured'
      ? t('tierFeatured')
      : planKey === 'premium'
        ? t('tierPremium')
        : t('tierFree');

  const notice =
    business.status === 'draft'
      ? { text: t('draftNotice'), variant: 'info' as const, showSubmit: true }
      : business.status === 'pending'
        ? { text: t('pendingNotice'), variant: 'info' as const, showSubmit: false }
        : business.status === 'rejected'
          ? { text: t('rejectedNotice'), variant: 'destructive' as const, showSubmit: true }
          : business.status === 'suspended'
            ? { text: t('suspendedNotice'), variant: 'destructive' as const, showSubmit: false }
            : null;

  const tiles = [
    { label: t('statTotalLeads'), value: stats.totalLeads, Icon: Inbox },
    { label: t('statThisMonth'), value: stats.leadsThisMonth, Icon: TrendingUp },
    { label: t('statAwaiting'), value: stats.awaitingReply, Icon: Send, urgent: stats.awaitingReply > 0 },
    { label: t('statWon'), value: stats.won, Icon: Trophy },
  ];

  return (
    <div className="space-y-6">
      {notice && (
        <Alert variant={notice.variant}>
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{notice.text}</span>
            {notice.showSubmit && <SubmitForReviewButton businessId={business.id} />}
          </AlertDescription>
        </Alert>
      )}

      <SetupChecklist business={business} />

      {business.status === 'approved' && (
        <ListedBadge
          listingUrl={absoluteUrl(`/business/${business.slug}`)}
          badgeUrl={absoluteUrl('/badges/listed-on-explore-tanzania.svg')}
        />
      )}

      {/* Where to upgrade, said on the page every operator opens first.

          Until now the only routes to the plans were typing the URL or
          tripping over a limit on another page, so an operator who simply
          wanted to pay could not find out how. This renders for every listing
          the dashboard shows, whenever it was registered and whatever plan it
          is on — there is no cutoff date and no eligibility test, because
          "which listings may see the prices" is not a question with an
          interesting answer.

          A trial says so rather than reading as Premium: an operator two days
          from the end of sixty free days needs the date more than the
          label. */}
      {SUBSCRIPTIONS_ENABLED && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border p-5',
            onFreePlan ? 'border-primary/30 bg-primary/5' : 'bg-card',
          )}
        >
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{t('tier')}</p>
            <p className="mt-0.5 font-display text-xl font-semibold">
              {planRow?.is_trial ? t('planTrial', { plan: planLabel }) : planLabel}
            </p>
            {onFreePlan && (
              <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
                {t('planFreeHint')}
              </p>
            )}
          </div>

          <Button asChild variant={onFreePlan ? 'primary' : 'secondary'}>
            <Link href="/dashboard/subscription">
              <Sparkles className="size-4" aria-hidden />
              {onFreePlan ? t('upgrade') : t('managePlan')}
            </Link>
          </Button>
        </div>
      )}

      <section>
        <h2 className="sr-only">{t('overview')}</h2>
        <StatGrid>
          {tiles.map(({ label, value, Icon, urgent }) => (
            <Stat key={label} label={label} value={value} icon={<Icon />} urgent={urgent} />
          ))}
        </StatGrid>
      </section>

      {/* Responsiveness is what the ranking rewards, so it is shown to the owner
          plainly rather than buried in an analytics tab. */}
      <StatGrid columns={2} className="sm:grid-cols-2">
        <Stat
          label={t('responseRate')}
          value={
            business.response_rate === null
              ? t('noData')
              : `${Math.round(Number(business.response_rate))}%`
          }
        />
        <Stat
          label={t('avgResponse')}
          value={
            business.avg_response_minutes === null
              ? t('noData')
              : t('hours', {
                  hours: Math.max(1, Math.round(business.avg_response_minutes / 60)),
                })
          }
        />
      </StatGrid>

      {stats.awaitingReply > 0 && (
        <Button asChild size="lg">
          <Link href="/dashboard/leads">
            <Inbox className="size-4" aria-hidden />
            {t('statAwaiting')} ({stats.awaitingReply})
          </Link>
        </Button>
      )}
    </div>
  );
}
