'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Menu, Search, Sparkles, X } from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/logo';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { UserMenu, MobileUserLinks } from '@/components/layout/user-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * The bar, named for what a visitor is looking for rather than for how the
 * data is stored.
 *
 * "Directory" and "Destinations" are what the tables are called. Nobody arrives
 * wanting a directory — they want a business, or a place. So the labels are
 * Businesses and Places, pointing at exactly the routes they always did. No new
 * pages, no duplicates: this is a rename at the surface.
 *
 * Tours & Safaris is the directory filtered to the category that holds 830 of
 * the site's listings. It earns a top-level slot on volume alone, and sending it
 * through the existing filter rather than building a page means it inherits
 * search, sort, pagination and every filter for free.
 *
 * The planning tools stay behind one menu. They answer one question each, in
 * the order somebody planning a trip asks them — when, what will it cost, where
 * else, what is nearby — and they are the site's actual differentiator. Flat in
 * the bar they overflowed it at 1280px; as peers of Businesses and Places they
 * were never browsed as peers anyway.
 */
const PLAN = [
  { href: '/when-to-go', key: 'whenToGo' },
  { href: '/trip-cost', key: 'tripCost' },
  { href: '/hidden-gems', key: 'hiddenGems' },
  { href: '/near-me', key: 'nearMe' },
] as const;

const NAV = [
  { href: '/directory', key: 'businesses' },
  { href: '/destinations', key: 'places' },
  { href: '/events', key: 'events' },
  { href: '/guides', key: 'guides' },
] as const;

export function SiteHeader() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const linkClass =
    'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors';
  const floatingLink = 'text-white/90 hover:bg-white/12 hover:text-white';
  const restingLink = 'text-muted-foreground hover:bg-secondary hover:text-foreground';
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // The header sits transparent over hero photography and only gains a surface
  // once content scrolls beneath it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const isHome = pathname === '/';
  const floating = isHome && !scrolled && !menuOpen;

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        floating
          ? 'bg-transparent'
          : 'border-b bg-background/85 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70',
      )}
    >
      <div className="container-page flex h-[var(--header-h)] items-center justify-between gap-4">
        <Link
          href="/"
          className={cn(
            'rounded-md transition-colors',
            floating && 'text-white [&_.text-primary]:text-white/85',
          )}
        >
          <Logo />
          <span className="sr-only">Explore Tanzania</span>
        </Link>

        {/* lg, not md: six items plus a locale switcher, a theme toggle,
            a user menu and a CTA do not fit a tablet bar, and the links used
            to wrap mid-phrase rather than overflow visibly. */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          <Link
            href={NAV[0].href}
            className={cn(linkClass, floating ? floatingLink : restingLink)}
          >
            {t(NAV[0].key)}
          </Link>

          {/* The directory, pre-filtered. 830 of the site's listings are in this
              one category, so it earns the slot — and routing it through the
              existing filter means it inherits search, sort and pagination
              rather than becoming a second page to maintain. */}
          <Link
            href={{ pathname: '/directory', query: { category: 'safaris' } }}
            className={cn(linkClass, floating ? floatingLink : restingLink)}
          >
            {t('tours')}
          </Link>


          {NAV.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(linkClass, floating ? floatingLink : restingLink)}
            >
              {t(item.key)}
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                linkClass,
                'flex items-center gap-1',
                floating ? floatingLink : restingLink,
              )}
            >
              {t('plan')}
              <ChevronDown className="size-3.5" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {PLAN.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href}>
                    <span className="flex flex-col">
                      <span className="font-medium">{t(item.key)}</span>
                      <span className="text-xs text-muted-foreground">
                        {t(`planHint.${item.key}`)}
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

        </nav>

        <div className="flex items-center gap-1">
          <div
            className={cn(
              'hidden items-center gap-1 lg:flex',
              floating && '[&_button]:text-white [&_button:hover]:bg-white/12',
            )}
          >
            <Link
              href="/search"
              aria-label={t('search')}
              className={cn(
                'rounded-lg p-2 transition-colors',
                floating ? 'text-white/90 hover:bg-white/12' : 'hover:bg-secondary',
              )}
            >
              <Search className="size-4" aria-hidden />
            </Link>
            <LocaleSwitcher />
            <ThemeToggle />
          </div>

          <div className="hidden sm:block">
            <UserMenu floating={floating} />
          </div>

          {/* Gold, and the only gold on the page. A header where three things
              compete for attention has no call to action; this has one. */}
          <Button
            asChild
            size="sm"
            className="hidden bg-brand-gold text-brand-gold-foreground hover:bg-brand-gold/90 sm:inline-flex"
          >
            <Link href="/register">
              <Sparkles className="size-4" aria-hidden />
              {t('listBusiness')}
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn('lg:hidden', floating && 'text-white hover:bg-white/12')}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="mobile-nav"
          className="animate-fade-in border-t bg-background lg:hidden"
        >
          <nav className="container-page flex flex-col py-4" aria-label="Mobile">
            <Link
              href={NAV[0].href}
              className="rounded-lg px-3 py-3.5 text-base font-medium hover:bg-secondary"
            >
              {t(NAV[0].key)}
            </Link>
            <Link
              href={{ pathname: '/directory', query: { category: 'safaris' } }}
              className="rounded-lg px-3 py-3.5 text-base font-medium hover:bg-secondary"
            >
              {t('tours')}
            </Link>
            {NAV.slice(1).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3.5 text-base font-medium hover:bg-secondary"
              >
                {t(item.key)}
              </Link>
            ))}

            {/* Flat on mobile, under a heading. A drawer has the room a bar
                does not, and a second tap to reach "when to go" would be a
                worse trade than a slightly longer list. */}
            <p className="mt-3 px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('plan')}
            </p>
            {PLAN.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3.5 text-base font-medium hover:bg-secondary"
              >
                {t(item.key)}
              </Link>
            ))}

            <div className="my-3 h-px bg-border" />

            <MobileUserLinks itemClass="block rounded-lg px-3 py-3.5 text-base font-medium hover:bg-secondary" />

            <Button
              asChild
              size="lg"
              className="mt-3 bg-brand-gold text-brand-gold-foreground hover:bg-brand-gold/90"
            >
              <Link href="/register">
                <Sparkles className="size-4" aria-hidden />
                {t('listBusiness')}
              </Link>
            </Button>

            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
