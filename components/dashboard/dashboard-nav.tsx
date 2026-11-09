'use client';

import { useTranslations } from 'next-intl';
import { BarChart3, ConciergeBell, Images, Inbox, LayoutDashboard, Package, Sparkles, Star, Store, Tag, Wallet } from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';
import { workspaceNavItemClass } from '@/components/layout/page-masthead';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/billing/enabled';

// Subscriptions were withdrawn in 2026-10 and this list was the one place that
// knew it, by simply leaving the plan page out. The page itself was never
// removed, so from the day the flag went back on (9 November 2026) the plans
// existed, were payable and were reachable only by typing the URL or by
// tripping over a limit somewhere else — an operator looking for "where do I
// upgrade" found nothing.
//
// Linked off the flag now rather than off a comment, so the two cannot drift
// apart again: turning subscriptions off hides it, turning them on shows it.
const ITEMS = [
  { href: '/dashboard', key: 'overview', Icon: LayoutDashboard },
  { href: '/dashboard/leads', key: 'leads', Icon: Inbox },
  { href: '/dashboard/reviews', key: 'reviewsNav', Icon: Star },
  { href: '/dashboard/profile', key: 'profile', Icon: Store },
  { href: '/dashboard/packages', key: 'packages', Icon: Package },
  { href: '/dashboard/deals', key: 'deals', Icon: Tag },
  { href: '/dashboard/gallery', key: 'gallery', Icon: Images },
  { href: '/dashboard/services', key: 'services', Icon: ConciergeBell },
  { href: '/dashboard/analytics', key: 'analytics', Icon: BarChart3 },
  { href: '/dashboard/payments', key: 'paymentsNav', Icon: Wallet },
  ...(SUBSCRIPTIONS_ENABLED
    ? ([{ href: '/dashboard/subscription', key: 'subscription', Icon: Sparkles }] as const)
    : []),
] as const;

export function DashboardNav({ pendingLeads = 0 }: { pendingLeads?: number }) {
  const t = useTranslations('dashboard');
  const pathname = usePathname();

  return (
    <nav
      // Horizontally scrollable on mobile rather than collapsed into a menu:
      // hiding these behind a tap costs more than it saves, and operators check
      // enquiries on a phone.
      className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0"
      aria-label={t('title')}
    >
      <ul className="flex gap-1 border-b pb-2 md:flex-col md:gap-0.5 md:border-b-0 md:pb-0">
        {ITEMS.map(({ href, key, Icon }) => {
          // Exact match for the index, prefix match for the rest, so /dashboard
          // does not light up while sitting on /dashboard/leads.
          const active =
            href === '/dashboard' ? pathname === href : pathname.startsWith(href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={workspaceNavItemClass(active)}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {t(key)}
                {key === 'leads' && pendingLeads > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground">
                    {pendingLeads}
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
