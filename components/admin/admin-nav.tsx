'use client';

import { useTranslations } from 'next-intl';
import {
  BadgeCheck,
  BookOpen,
  ClipboardList,
  CreditCard,
  Inbox,
  LayoutDashboard,
  Mail,
  MapPin,
  Send,
  MailWarning,
  Settings,
  Star,
  Store,
  TrendingUp, Wallet, MessageSquare } from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';
import { workspaceNavItemClass } from '@/components/layout/page-masthead';

const ITEMS = [
  { href: '/admin', key: 'overview', Icon: LayoutDashboard },
  { href: '/admin/businesses', key: 'businesses', Icon: Store, badge: 'businesses' },
  { href: '/admin/leads', key: 'leads', Icon: Inbox },
  { href: '/admin/claims', key: 'claims', Icon: BadgeCheck, badge: 'claims' },
  { href: '/admin/reviews', key: 'reviews', Icon: Star, badge: 'reviews' },
  { href: '/admin/engagement', key: 'engagementNav', Icon: MessageSquare },
  { href: '/admin/destinations', key: 'destinations', Icon: MapPin },
  { href: '/admin/guides', key: 'guides', Icon: BookOpen },
  { href: '/admin/outreach', key: 'outreach', Icon: Send },
  { href: '/admin/outreach/unreached', key: 'unreached', Icon: MailWarning },
  { href: '/admin/messages', key: 'messages', Icon: Mail },
  { href: '/admin/subscriptions', key: 'subscriptions', Icon: CreditCard },
  { href: '/admin/payments', key: 'paymentsNav', Icon: Wallet },
  { href: '/admin/metrics', key: 'metrics', Icon: TrendingUp },
  { href: '/admin/settings', key: 'settings', Icon: Settings },
  { href: '/admin/audit', key: 'audit', Icon: ClipboardList },
] as const;

export function AdminNav({
  pendingBusinesses = 0,
  pendingReviews = 0,
  pendingClaims = 0,
}: {
  pendingBusinesses?: number;
  pendingReviews?: number;
  pendingClaims?: number;
}) {
  const t = useTranslations('admin');
  const pathname = usePathname();

  const counts: Record<string, number> = {
    businesses: pendingBusinesses,
    reviews: pendingReviews,
    claims: pendingClaims,
  };

  return (
    <nav className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0" aria-label={t('title')}>
      <ul className="flex gap-1 border-b pb-2 md:flex-col md:gap-0.5 md:border-b-0 md:pb-0">
        {ITEMS.map(({ href, key, Icon, ...rest }) => {
          const active =
            href === '/admin' ? pathname === href : pathname.startsWith(href);
          const badgeKey = 'badge' in rest ? (rest.badge as string) : null;
          const count = badgeKey ? counts[badgeKey] : 0;

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={workspaceNavItemClass(active)}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {t(key)}
                {count > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
