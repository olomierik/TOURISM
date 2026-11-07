'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Compass, Heart, House, Map, UserRound, type LucideIcon } from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';
import { useViewer } from '@/components/layout/user-menu';
import { cn } from '@/lib/utils';

/**
 * The phone tab bar (mobile-first redesign, 2026-11): Home, Explore, Map,
 * Saved, Account — the five places a traveller goes back to, one thumb away.
 *
 * Below `lg` only. Computers keep the side rail (site-sidebar.tsx), which has
 * the room to show every section; on a phone the rail is a drawer behind the
 * header's menu button, and that drawer stays as the way to everything else
 * (guides, when to go, trip cost, events…). The tab bar does not replace it,
 * it puts the five most-used destinations where a thumb already is.
 *
 * Hidden where a page pins its own bar to the bottom edge: a business profile
 * carries the Call / WhatsApp / Request a quote bar (business/action-bar.tsx),
 * and two stacked bars would cost a sixth of the screen and put "Saved" a few
 * pixels from "Request a quote". Also hidden in the operator and admin
 * workspaces, which have their own navigation and are not traveller pages.
 *
 * It renders its own spacer in the page flow, so the footer is never under it,
 * and pads for the iPhone home indicator with env(safe-area-inset-bottom)
 * (the viewport is `viewport-fit=cover`-safe either way: the inset is 0
 * where there is no indicator).
 */

type Tab = {
  key: 'home' | 'explore' | 'map' | 'saved' | 'account';
  href: '/' | '/directory' | '/near-me' | '/account/favorites' | '/account' | '/login';
  Icon: LucideIcon;
  active: (p: string) => boolean;
};

/** Routes with their own bottom bar, or their own navigation. */
function hiddenOn(pathname: string) {
  return (
    (pathname.startsWith('/business/') && !pathname.endsWith('/claim')) ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin')
  );
}

export function BottomTabBar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const viewer = useViewer();
  const typing = useTyping();

  if (hiddenOn(pathname)) return null;

  const tabs: Tab[] = [
    { key: 'home', href: '/', Icon: House, active: (p) => p === '/' },
    {
      key: 'explore',
      href: '/directory',
      Icon: Compass,
      active: (p) =>
        p.startsWith('/directory') || p.startsWith('/search') || p.startsWith('/destinations'),
    },
    { key: 'map', href: '/near-me', Icon: Map, active: (p) => p.startsWith('/near-me') },
    {
      key: 'saved',
      href: '/account/favorites',
      Icon: Heart,
      active: (p) => p.startsWith('/account/favorites'),
    },
    {
      key: 'account',
      href: viewer ? '/account' : '/login',
      Icon: UserRound,
      active: (p) =>
        (p.startsWith('/account') && !p.startsWith('/account/favorites')) ||
        p === '/login' ||
        p === '/register' ||
        p === '/signup',
    },
  ];

  return (
    <>
      {/* Holds the bar's height in the page flow, so the last thing on every
          page — the footer — scrolls clear of it. */}
      <div aria-hidden className="h-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] shrink-0 lg:hidden" />
      <nav
        aria-label={t('tabBar')}
        className={cn(
          'fixed inset-x-0 bottom-0 z-[var(--z-header)] border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg supports-[backdrop-filter]:bg-background/85 lg:hidden',
          'transition-transform duration-200 ease-out motion-reduce:transition-none',
          // Out of the way while the keyboard is up (see useTyping).
          typing && 'pointer-events-none translate-y-full',
        )}
      >
        <ul className="mx-auto grid h-[var(--tabbar-h)] max-w-xl grid-cols-5">
          {tabs.map(({ key, href, Icon, active }) => {
            const current = active(pathname);
            return (
              <li key={key} className="flex">
                <Link
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium leading-none transition-colors',
                    'active:scale-95 motion-reduce:active:scale-100',
                    current ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {/* The active tab gets a short bar above its icon as well as
                      the colour, so it does not rely on colour alone. */}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-0 h-0.5 w-8 rounded-b-full bg-primary transition-opacity',
                      current ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <Icon
                    className={cn('size-[1.375rem]', current && 'fill-primary/15')}
                    strokeWidth={current ? 2.25 : 1.75}
                    aria-hidden
                  />
                  <span>{t(key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

/**
 * True while a text field has focus.
 *
 * Android shrinks the viewport when the keyboard opens, so a bar fixed to the
 * bottom rides up and sits on the field being typed in, or on the form's own
 * submit button. Sliding it away while typing is what installed apps do; it
 * comes back the moment focus leaves the field.
 */
function useTyping() {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      (el.isContentEditable ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el instanceof HTMLInputElement &&
          !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file', 'color'].includes(el.type)));
    const onIn = (e: FocusEvent) => setTyping(isField(e.target));
    const onOut = () => setTyping(false);
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);
  return typing;
}
