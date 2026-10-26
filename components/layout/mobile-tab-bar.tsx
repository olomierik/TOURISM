'use client';

import { useTranslations } from 'next-intl';
import { Compass, Heart, House, MapPin, UserRound } from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';
import { useViewer } from '@/components/layout/user-menu';
import { cn } from '@/lib/utils';

/**
 * Bottom navigation on phones, as travel apps have it: five large targets in
 * thumb reach, so nothing on a small screen depends on finding the menu.
 *
 * Hidden from 768px up, where the header has room for everything. A listing
 * page pins its own action bar (Call, WhatsApp, Get a quote) to the same
 * spot; globals.css hides this bar there rather than stacking two.
 *
 * The spacer keeps the footer's last line above the bar.
 */
export function MobileTabBar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const viewer = useViewer();

  const signedIn = Boolean(viewer);
  const items = [
    { href: '/', label: t('home'), Icon: House, active: pathname === '/' },
    {
      href: '/directory',
      label: t('directory'),
      Icon: Compass,
      active: pathname.startsWith('/directory') || pathname.startsWith('/business'),
    },
    {
      href: '/destinations',
      label: t('destinations'),
      Icon: MapPin,
      active: pathname.startsWith('/destinations'),
    },
    {
      href: '/account/favorites',
      label: t('saved'),
      Icon: Heart,
      active: pathname.startsWith('/account/favorites'),
    },
    {
      href: signedIn ? '/account' : '/login',
      label: signedIn ? t('account') : t('login'),
      Icon: UserRound,
      active:
        pathname === '/login' ||
        pathname === '/register' ||
        (pathname.startsWith('/account') && !pathname.startsWith('/account/favorites')),
    },
  ] as const;

  return (
    // §6.6: hidden on any page that renders the business action bar. Two
    // fixed bars stacked at the foot of a 375px screen is 128px of chrome over
    // the content, and the lower one swallows the taps meant for the upper.
    // Expressed as a sibling selector in globals.css keyed off the action
    // bar's data attribute, so neither component imports the other.
    <div data-mobile-tab-bar className="md:hidden">
      <div aria-hidden className="h-16" />
      <nav
        aria-label={t('tabBar')}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="grid grid-cols-5">
          {items.map(({ href, label, Icon, active }) => (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className={cn('size-5', active && 'fill-primary/15')} aria-hidden />
                <span className="w-full truncate text-center">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
