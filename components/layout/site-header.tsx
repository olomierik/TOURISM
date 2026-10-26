'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, LayoutDashboard, Menu, Search, Sparkles, X } from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/logo';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { UserMenu, MobileUserLinks, useViewer } from '@/components/layout/user-menu';
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
/* §6.6: When to go, Trip cost, Hidden gems, Events, Travel guides.
 *
 * Events and Travel guides move in from the top bar, and Near me moves out —
 * §7.1 sends it here from the homepage, and the menu is the planning tools, of
 * which "what is around me right now" is one. */
const PLAN = [
  { href: '/when-to-go', key: 'whenToGo' },
  { href: '/trip-cost', key: 'tripCost' },
  { href: '/hidden-gems', key: 'hiddenGems' },
  { href: '/near-me', key: 'nearMe' },
  { href: '/events', key: 'events' },
  { href: '/guides', key: 'guides' },
] as const;

/* §6.6 and the §8.1 canonical vocabulary.
 *
 * G7 was that the same page had two names depending on where you met it: the
 * header said Businesses and the footer said Directory; the header said Places
 * and the footer said Destinations; the breadcrumb used both. One concept, one
 * label, everywhere — so `businesses` and `places` are gone and `directory` and
 * `destinations` are the only names for those routes.
 *
 * The three categories are the directory filtered, which is how "Tours &
 * Safaris" already worked: no new page, and each inherits search, sort,
 * pagination and every filter for free. Only categories above the §7.1
 * threshold get a slot — Safaris 1,066, Stays 224, Transfers 100. */
const NAV = [
  { href: { pathname: '/directory', query: { category: 'safaris' } }, key: 'safaris' },
  { href: { pathname: '/directory', query: { category: 'hotels' } }, key: 'stays' },
  { href: { pathname: '/directory', query: { category: 'car-rental' } }, key: 'transfers' },
  { href: '/destinations', key: 'destinations' },
] as const;

export function SiteHeader() {
  const t = useTranslations('nav');
  // An operator already has a listing to run: the header's one call to action
  // is their dashboard, not "List your business" again.
  const viewer = useViewer();
  const isOperator = viewer?.role === 'business_owner';
  const pathname = usePathname();

  const linkClass =
    'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors';
  const restingLink = 'text-muted-foreground hover:bg-secondary hover:text-foreground';
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
      <div className="container-page flex h-[var(--header-h)] items-center justify-between gap-4">
        <Link
          href="/"
          className="rounded-md transition-colors"
        >
          <Logo />
          <span className="sr-only">Explore Tanzania</span>
        </Link>

        {/* xl, not lg — and this is measured, not guessed.
        
            At exactly 1024px the header wanted 1270px: 211 for the lockup, 575
            for these six links, 420 for search, locale, theme, account and the
            CTA. lg turns this nav on at 1024, so the bar overflowed the viewport
            by 246px and the whole page scrolled sideways. It was clean at 768
            and at 1280 and broke only in between, which is iPad landscape and
            every small laptop — the widths least likely to be checked.
        
            An earlier pass moved this from md to lg for the same reason and did
            not go far enough. 1270 is the number; xl is the first breakpoint
            above it. */}
        <nav className="hidden items-center gap-1 xl:flex" aria-label="Main">
          {/* Every item comes from NAV, once.

              Safaris used to be a hardcoded link here labelled `tours`
              ("Tours & Safaris"), with the loop below starting at slice(1) to
              step around it. Phase 3 pointed the loop at the whole of NAV but
              left the hardcoded link standing, so the bar rendered "Safaris"
              twice — identical label, identical href. The comment that used to
              sit here described the fix while the code beneath it reintroduced
              the fault, which is the specific way a nav regression survives
              review: the explanation reads correct. */}
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(linkClass, restingLink)}
            >
              {t(item.key)}
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                linkClass,
                'flex items-center gap-1',
                restingLink,
              )}
            >
              {t('plan')}
              <ChevronDown className="size-3.5" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {PLAN.map((item) => (
                <DropdownMenuItem key={item.key} asChild>
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
              'hidden items-center gap-1 xl:flex',
            )}
          >
            <Link
              href="/search"
              aria-label={t('search')}
              className={cn(
                'rounded-lg p-2 transition-colors',
                'hover:bg-secondary',
              )}
            >
              <Search className="size-4" aria-hidden />
            </Link>
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

          <Button
            variant="ghost"
            size="icon"
            className="xl:hidden"
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
          className="animate-fade-in border-t bg-background xl:hidden"
        >
          <nav className="container-page flex flex-col py-4" aria-label="Mobile">
            {/* The whole of NAV, same as the desktop bar. It was NAV[0] plus
                slice(1), which produces the right output and means a change to
                either half has to be made twice. */}
            {NAV.map((item) => (
              <Link
                key={item.key}
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
                key={item.key}
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
              className="mt-3 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isOperator ? (
                <Link href="/dashboard">
                  <LayoutDashboard className="size-4" aria-hidden />
                  {t('myDashboard')}
                </Link>
              ) : (
                <Link href={{ pathname: '/register', query: { as: 'business' } }}>
                  <Sparkles className="size-4" aria-hidden />
                  {t('listBusiness')}
                </Link>
              )}
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
