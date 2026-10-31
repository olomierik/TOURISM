'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  BedDouble,
  Binoculars,
  BookOpen,
  Calculator,
  CalendarDays,
  Car,
  Compass,
  Gem,
  Heart,
  House,
  LocateFixed,
  MapPin,
  PawPrint,
  Ticket,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';
import { Logo } from '@/components/layout/logo';
import { MobileUserLinks, useViewer } from '@/components/layout/user-menu';
import { cn } from '@/lib/utils';

/**
 * The site's side menu (2026-10-31, owner's call): every menu item lives here,
 * on every page, so the top bar can stay slim and the page gets the room.
 *
 * - Computers (lg+): an always-open narrow rail on the left - icon over a
 *   short name - under the sticky header.
 * - Phones and tablets: the same list slides in from the left from the menu
 *   button in the header (SiteHeader owns the open state). The bottom tab bar
 *   is gone; this replaces it.
 *
 * Same routes and the same labels the header and tab bar used; nothing new is
 * linked.
 */

type Href = React.ComponentProps<typeof Link>['href'];
type NavKey =
  | 'home'
  | 'safaris'
  | 'stays'
  | 'transfers'
  | 'directory'
  | 'destinations'
  | 'wildlife'
  | 'whenToGo'
  | 'tripCost'
  | 'hiddenGems'
  | 'nearMe'
  | 'events'
  | 'guides'
  | 'saved'
  | 'account'
  | 'login';
type Item = {
  href: Href;
  key: NavKey;
  Icon: LucideIcon;
  match?: (p: string) => boolean;
};

const EXPLORE: Item[] = [
  { href: '/', key: 'home', Icon: House, match: (p) => p === '/' },
  {
    href: { pathname: '/directory', query: { category: 'safaris' } },
    key: 'safaris',
    Icon: Binoculars,
  },
  {
    href: { pathname: '/directory', query: { category: 'hotels' } },
    key: 'stays',
    Icon: BedDouble,
  },
  {
    href: { pathname: '/directory', query: { category: 'car-rental' } },
    key: 'transfers',
    Icon: Car,
  },
  {
    href: '/directory',
    key: 'directory',
    Icon: Compass,
    match: (p) => p.startsWith('/directory') || p.startsWith('/business'),
  },
  { href: '/destinations', key: 'destinations', Icon: MapPin },
  { href: '/wildlife', key: 'wildlife', Icon: PawPrint },
];

const PLAN: Item[] = [
  { href: '/when-to-go', key: 'whenToGo', Icon: CalendarDays },
  { href: '/trip-cost', key: 'tripCost', Icon: Calculator },
  { href: '/hidden-gems', key: 'hiddenGems', Icon: Gem },
  { href: '/near-me', key: 'nearMe', Icon: LocateFixed },
  { href: '/events', key: 'events', Icon: Ticket },
  { href: '/guides', key: 'guides', Icon: BookOpen },
];

function isActive(item: Item, pathname: string) {
  if (item.match) return item.match(pathname);
  // Category links share /directory and differ only by query, which this
  // component cannot read without opting pages out of static rendering; the
  // "Directory" item carries the highlight for all of them.
  if (typeof item.href !== 'string') return false;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function useAccountItems(): Item[] {
  const viewer = useViewer();
  const signedIn = Boolean(viewer);
  return [
    {
      href: '/account/favorites',
      key: 'saved',
      Icon: Heart,
      match: (p) => p.startsWith('/account/favorites'),
    },
    {
      href: signedIn ? '/account' : '/login',
      key: signedIn ? 'account' : 'login',
      Icon: UserRound,
      match: (p) =>
        p === '/login' ||
        p === '/register' ||
        (p.startsWith('/account') && !p.startsWith('/account/favorites')),
    },
  ];
}

/** Always-open narrow rail, computers only. */
export function SiteRail() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const account = useAccountItems();

  const groups = [EXPLORE, PLAN, account];

  return (
    <aside
      aria-label={t('tabBar')}
      className="fixed bottom-0 left-0 top-[var(--header-h)] z-30 hidden w-[var(--rail-w)] border-r bg-surface lg:block"
    >
      <nav className="flex h-full flex-col gap-0.5 overflow-y-auto overscroll-contain px-1.5 py-2 [scrollbar-width:thin]">
        {groups.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <div aria-hidden className="mx-3 my-1 h-px shrink-0 bg-border" />}
            {group.map((item) => {
              const active = isActive(item, pathname);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  title={t(item.key)}
                  className={cn(
                    'flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-center text-[0.6875rem] font-medium leading-tight transition-colors',
                    active
                      ? 'bg-primary-subtle text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <item.Icon
                    className={cn('size-[1.125rem]', active && 'fill-primary/15')}
                    aria-hidden
                  />
                  <span className="line-clamp-2 w-full">{t(item.key)}</span>
                </Link>
              );
            })}
          </React.Fragment>
        ))}
      </nav>
    </aside>
  );
}

/** Slide-in side menu for phones and tablets. */
export function SiteDrawer({
  open,
  onClose,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  /** Language, theme and the call to action, passed in by the header. */
  footer?: React.ReactNode;
}) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Drawn into <body>: the header it is opened from has a backdrop blur, and a
  // blurred ancestor traps `position: fixed` children inside its own box.
  const mounted = React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const row = (item: Item) => {
    const active = isActive(item, pathname);
    return (
      <Link
        key={item.key}
        href={item.href}
        onClick={onClose}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium transition-colors',
          active ? 'bg-primary-subtle text-primary' : 'text-foreground hover:bg-secondary',
        )}
      >
        <item.Icon className="size-[1.125rem] shrink-0 text-current opacity-80" aria-hidden />
        {t(item.key)}
      </Link>
    );
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn('fixed inset-0 z-[var(--z-modal)] lg:hidden', !open && 'pointer-events-none')}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label={t('closeMenu')}
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-foreground/30 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />
      <nav
        id="mobile-nav"
        aria-label={t('tabBar')}
        inert={!open}
        className={cn(
          'absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col overflow-y-auto border-r bg-background px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[var(--elev-xl)] transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-2 flex items-center justify-between pl-2">
          <Link href="/" onClick={onClose} className="rounded-md">
            <Logo />
            <span className="sr-only">Explore Tanzania</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('closeMenu')}
            className="grid size-9 place-items-center rounded-full hover:bg-secondary"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-0.5">{EXPLORE.map(row)}</div>
        <p className="px-3 pb-1 pt-4 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {t('plan')}
        </p>
        <div className="flex flex-col gap-0.5">{PLAN.map(row)}</div>
        <div aria-hidden className="mx-3 my-3 h-px bg-border" />
        {/* Account links as the old phone menu listed them: sign in and list
            your business, or the signed-in person's own pages and sign out. */}
        <div className="flex flex-col gap-0.5">
          <MobileUserLinks itemClass="block rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium hover:bg-secondary" />
        </div>
        {footer && <div className="mt-auto pt-4">{footer}</div>}
      </nav>
    </div>,
    document.body,
  );
}

const noopSubscribe = () => () => {};
