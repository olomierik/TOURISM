'use client';

import { useTranslations } from 'next-intl';
import { CreditCard, Images, Inbox, LayoutDashboard, Package, Store } from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/dashboard', key: 'overview', Icon: LayoutDashboard },
  { href: '/dashboard/leads', key: 'leads', Icon: Inbox },
  { href: '/dashboard/profile', key: 'profile', Icon: Store },
  { href: '/dashboard/packages', key: 'packages', Icon: Package },
  { href: '/dashboard/gallery', key: 'gallery', Icon: Images },
  { href: '/dashboard/subscription', key: 'subscription', Icon: CreditCard },
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
      <ul className="flex gap-1 border-b md:flex-col md:gap-0.5 md:border-b-0">
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
                className={cn(
                  'flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {t(key)}
                {key === 'leads' && pendingLeads > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
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
