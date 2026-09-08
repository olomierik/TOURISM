import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BadgeCheck, ClipboardCheck, Inbox, Star, Store } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { getAdminOverview } from '@/lib/queries/admin';
import { Stat, StatGrid } from '@/components/ui/stat';

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
      <StatGrid columns={3}>
        {tiles.map(({ label, value, Icon, href, urgent }) => (
          <Stat
            key={label}
            label={label}
            value={value}
            icon={<Icon />}
            href={href}
            urgent={urgent}
          />
        ))}
      </StatGrid>
    </div>
  );
}
