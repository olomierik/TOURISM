import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BadgeCheck, ClipboardCheck, Inbox, Star, Store, UserCheck } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import type { LocaleParams } from '@/i18n/routing';
import { getAdminOverview, getPendingClaims } from '@/lib/queries/admin';
import { Stat, StatGrid } from '@/components/ui/stat';

/** How many of the waiting claims the overview names before deferring to the queue. */
const CLAIMS_SHOWN = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

function daysWaiting(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS));
}

export default async function AdminOverview({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, overview, claims] = await Promise.all([
    getTranslations('admin'),
    getAdminOverview(),
    getPendingClaims(CLAIMS_SHOWN),
  ]);

  const tiles = [
    {
      label: t('statPending'),
      value: overview.pendingBusinesses,
      Icon: ClipboardCheck,
      href: '/admin/businesses' as const,
      urgent: overview.pendingBusinesses > 0,
    },
    {
      label: t('statPendingReviews'),
      value: overview.pendingReviews,
      Icon: Star,
      href: '/admin/reviews' as const,
      urgent: overview.pendingReviews > 0,
    },
    {
      // Third of the three queues that mean somebody is waiting on us, and the
      // one that was missing: until now a claim announced itself only as a
      // badge in the side nav, which is not where anyone looks first.
      label: t('statClaims'),
      value: overview.pendingClaims,
      Icon: UserCheck,
      href: '/admin/claims' as const,
      urgent: overview.pendingClaims > 0,
    },
    { label: t('statLive'), value: overview.liveBusinesses, Icon: Store, href: '/admin/businesses' as const },
    { label: t('statUnverified'), value: overview.unverifiedBusinesses, Icon: BadgeCheck, href: '/admin/businesses' as const },
    { label: t('statLeadsMonth'), value: overview.leadsThisMonth, Icon: Inbox, href: '/admin/leads' as const },
  ];

  return (
    <div className="space-y-8">
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

      {/*
        The claims themselves, not just their count. A number tells an admin
        that somebody is waiting; it does not say who, for which listing, or how
        long — and "how long" is the part that decides what to open first.

        Deciding still happens in the queue. Approving transfers a listing, its
        enquiries and its lead routing to a stranger, and that button belongs on
        one surface next to the evidence it is weighed against, not duplicated
        onto a summary page.
      */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">{t('claimsWaitingTitle')}</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t('claimsWaitingHint')}
            </p>
          </div>
          <Link
            href="/admin/claims"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {overview.pendingClaims > claims.length
              ? t('claimsWaitingAll', { count: overview.pendingClaims })
              : t('claimsWaitingOpen')}
          </Link>
        </div>

        {/*
          Rendered at zero too, rather than hidden. An admin who has been told
          claims appear here needs to see that nothing is waiting — a section
          that vanishes is indistinguishable from one that is broken.
        */}
        {claims.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t('claimsPage.empty')}
          </p>
        ) : (
          <ul className="mt-4 divide-y rounded-xl border bg-card">
            {claims.map((c) => {
              const days = daysWaiting(c.createdAt);
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      <Link
                        href={{ pathname: '/business/[slug]', params: { slug: c.businessSlug } }}
                        className="hover:text-primary"
                      >
                        {c.businessName}
                      </Link>
                      {c.businessCity && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {c.businessCity}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {c.contactName} · {c.contactEmail}
                    </p>
                  </div>
                  <span
                    className={
                      // A fortnight unanswered is the point at which an operator
                      // who was willing to list gives up on us.
                      days >= 14
                        ? 'shrink-0 text-sm font-medium tabular-nums text-warning-foreground'
                        : 'shrink-0 text-sm tabular-nums text-muted-foreground'
                    }
                  >
                    {t('claimsWaitingDays', { days })}
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
