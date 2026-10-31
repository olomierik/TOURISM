'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LayoutDashboard, Menu, PawPrint, Search, Sparkles } from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/logo';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { UserMenu, useViewer } from '@/components/layout/user-menu';
import { SiteDrawer } from '@/components/layout/site-sidebar';
import { cn } from '@/lib/utils';

/**
 * The top bar (side-menu layout, 2026-10-31): logo, the wildlife guide (the
 * owner wants it up here), search, language, theme, account and the one call
 * to action. Every other menu item lives in the side menu - an always-open
 * rail on computers and a slide-in drawer on phones and tablets
 * (components/layout/site-sidebar.tsx), opened from the button on the left.
 */
function isCurrent(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const t = useTranslations('nav');
  // An operator already has a listing to run: the header's one call to action
  // is their dashboard, not "List your business" again.
  const viewer = useViewer();
  const isOperator = viewer?.role === 'business_owner';
  const pathname = usePathname();

  // Field-guide restyle (2026-10): every top-level item is a bordered pill, and
  // the page you are on is the filled one.
  const linkClass =
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors';
  const restingLink =
    'border-border bg-surface text-foreground/80 hover:border-primary/40 hover:text-foreground';
  const currentLink = 'border-primary bg-primary text-primary-foreground hover:bg-primary-hover';
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile sheet on navigation. Adjusting state during render is React's
  // documented pattern for reacting to a changed value — an effect would render the
  // stale open sheet first, then close it, which is a visible flicker on mobile.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  // Prevent the page scrolling behind the open mobile sheet.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <header
      // §6.6: --background at 95% with backdrop blur, and a bottom border.
      //
      // The transparent-over-photo variant is gone. It rendered white links on
      // the home page until the first scroll, which was right when the hero
      // was a full-bleed photograph and became invisible the moment §7.1
      // replaced that with a light --surface-muted panel: white nav links on a
      // near-white ground, on the first screen of the site. The condition that
      // produced it (isHome && !scrolled) had no other caller — destination
      // and package heroes already render under an opaque header — so the
      // whole state, and the scroll listener driving it, are removed rather
      // than left for the next photographic hero that may never come.
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-lg',
        'supports-[backdrop-filter]:bg-background/80',
      )}
    >
      <div className="container-page flex h-[var(--header-h)] items-center gap-2 sm:gap-4 lg:max-w-none">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 shrink-0 lg:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
        >
          <Menu className="size-5" />
        </Button>
        <Link
          href="/"
          className="rounded-md transition-colors"
        >
          <Logo />
          <span className="sr-only">Explore Tanzania</span>
        </Link>

        {/* Side-menu layout (2026-10-31): every menu item lives in the side
            menu (components/layout/site-sidebar.tsx). The owner keeps the
            wildlife guide up here as well. */}
        <nav className="mr-auto flex items-center" aria-label="Main">
          <Link
            href="/wildlife"
            aria-current={isCurrent('/wildlife', pathname) ? 'page' : undefined}
            aria-label={t('wildlife')}
            className={cn(
              linkClass,
              'max-sm:size-9 max-sm:justify-center max-sm:px-0',
              isCurrent('/wildlife', pathname) ? currentLink : restingLink,
            )}
          >
            <PawPrint className="size-3.5" aria-hidden />
            <span className="max-sm:sr-only">{t('wildlife')}</span>
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <Link
              href="/search"
              aria-label={t('search')}
              className={cn(
                'rounded-full border border-border bg-surface p-2 transition-colors',
                'hover:border-primary/40',
              )}
            >
              <Search className="size-4" aria-hidden />
            </Link>
          <div className="hidden items-center gap-1 lg:flex">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>

          <div className="hidden sm:block">
            <UserMenu />
          </div>

          {/* Gold, and the only gold on the page. A header where three things
              compete for attention has no call to action; this has one. */}
          {/* G10: "List your business" was the only filled button in the
              header, on every traveller page — the supplier's call to action
              dominating an audience that is not suppliers. §6.6 moves it to the
              account menu, the footer and /for-business, and gives the slot to
              the one thing §7.0 says every traveller template is for.
              
              An operator still sees their dashboard here: they have a listing
              to run, and "Get free quotes" is not their errand. */}
          <Button asChild size="sm" className="hidden sm:inline-flex">
            {isOperator ? (
              <Link href="/dashboard">
                <LayoutDashboard className="size-4" aria-hidden />
                {t('myDashboard')}
              </Link>
            ) : (
              <Link href="/request-quote">
                <Sparkles className="size-4" aria-hidden />
                {t('getFreeQuotes')}
              </Link>
            )}
          </Button>

        </div>
      </div>

      <SiteDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        footer={
          <div className="flex flex-col gap-3 border-t pt-4">
            <Button asChild size="md" className="w-full">
              {isOperator ? (
                <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                  <LayoutDashboard className="size-4" aria-hidden />
                  {t('myDashboard')}
                </Link>
              ) : (
                <Link href="/request-quote" onClick={() => setMenuOpen(false)}>
                  <Sparkles className="size-4" aria-hidden />
                  {t('getFreeQuotes')}
                </Link>
              )}
            </Button>
            <div className="flex items-center justify-between">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </div>
        }
      />
    </header>
  );
}
