import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BadgeCheck, ClipboardCheck, Inbox, Star, Store } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getAdminOverview } from '@/lib/queries/admin';
import { cn } from '@/lib/utils';

export default async function AdminOverview({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, overview] = await Promise.all([
    getTranslations('admin'),
    getAdminOverview(),
  ]);

  const tiles = [
    {
      label: t('statPending'),
      value: overview.pendingBusinesses,
      Icon: ClipboardCheck,
      href: '/admin/businesses' as const,
      // The queue is the only number that represents somebody waiting on us.
      urgent: overview.pendingBusinesses > 0,
    },
    {
      label: t('statPendingReviews'),
      value: overview.pendingReviews,
      Icon: Star,
      href: '/admin/reviews' as const,
      urgent: overview.pendingReviews > 0,
    },
    { label: t('statLive'), value: overview.liveBusinesses, Icon: Store, href: '/admin/businesses' as const },
    { label: t('statUnverified'), value: overview.unverifiedBusinesses, Icon: BadgeCheck, href: '/admin/businesses' as const },
    { label: t('statLeadsMonth'), value: overview.leadsThisMonth, Icon: Inbox, href: '/admin/leads' as const },
  ];

  return (
    <div>
      <h2 className="sr-only">{t('overview')}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ label, value, Icon, href, urgent }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              'rounded-2xl border bg-card p-5 transition-colors hover:bg-secondary/40',
              urgent && 'border-primary/40 bg-primary/[0.03]',
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon
                className={cn('size-4', urgent ? 'text-primary' : 'text-muted-foreground')}
                aria-hidden
              />
            </div>
            <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
