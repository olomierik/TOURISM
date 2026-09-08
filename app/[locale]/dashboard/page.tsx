import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AlertTriangle, Inbox, Send, Store, TrendingUp, Trophy } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getMyBusiness, getDashboardStats } from '@/lib/queries/dashboard';
import { CreateBusinessForm } from '@/components/dashboard/create-business-form';
import { SubmitForReviewButton } from '@/components/dashboard/submit-for-review';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Stat, StatGrid } from '@/components/ui/stat';

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
        <div className="rounded-2xl border bg-card p-5 sm:p-8">
          <CreateBusinessForm />
        </div>
      </div>
    );
  }

  const stats = await getDashboardStats(business.id);

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
