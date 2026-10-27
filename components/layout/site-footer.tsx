import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NewsletterForm } from '@/components/newsletter/newsletter-form';
import type { Locale } from '@/i18n/routing';

export async function SiteFooter() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('footer');
  const tNav = await getTranslations('nav');
  const tBrand = await getTranslations('brand');
  const year = new Date().getFullYear();

  /* One flat list, because the footer no longer renders headings.

     The five columns were the right shape for a footer carrying a newsletter
     form, a tagline and five section labels; they are the wrong shape for a
     footer whose job is to stay out of the way. A heading that labels two
     links costs more height than the two links do.

     The labels are the header's, pointing at the header's routes. That is the
     whole of G7: a reader met "Businesses" in the bar and "Directory" down
     here for one page, and "Places" against "Destinations" for another. §8.1
     gives each concept one name, and the acceptance test is that the three
     places a label appears — header, footer, breadcrumb — cannot disagree in
     any of the five locales.

     One link per page, and no link that is only a filtered view of a page
     already listed. The row has to hold on one line, and ?category=safaris
     spends that budget on a view the header's own menu already offers. What
     earns the space is every route with no other server-rendered path to it.

     The planning pages are why that matters. They live in the header's "Plan"
     menu, which is a Radix DropdownMenu, so its content is not rendered until
     somebody opens it: /when-to-go and its twelve month pages, /trip-cost,
     /hidden-gems and /near-me appeared zero times in the served markup of
     every page on the site. This row is their server-rendered path. */
  const links = [
    { href: '/directory', label: tNav('directory') },
    { href: '/destinations', label: tNav('destinations') },
    { href: '/when-to-go', label: tNav('whenToGo') },
    { href: '/trip-cost', label: tNav('tripCost') },
    { href: '/hidden-gems', label: tNav('hiddenGems') },
    { href: '/near-me', label: tNav('nearMe') },
    { href: { pathname: '/register', query: { as: 'business' } }, label: t('listBusiness') },
    { href: '/about', label: tNav('about') },
    { href: '/contact', label: tNav('contact') },
    { href: '/privacy', label: t('privacy') },
    { href: '/terms', label: t('terms') },
  ] as const;

  // §6.6: the footer sits on --surface-muted, at full strength. It was
  // bg-muted/40 — the same token diluted to 40%, a value that lands between
  // the page and the band and reads as neither.
  return (
    <footer className="mt-auto border-t bg-surface-muted">
      {/* One row. It was a five-column grid, then a newsletter block, then a
          legal bar — roughly 480px of chrome under every page on the site,
          most of it whitespace between headings. Everything that survived is
          on a single line: brand, the links, the newsletter as one field, and
          the two controls.

          Wrapping rather than scrolling below lg, because a footer that
          scrolls sideways hides the thing somebody scrolled to the bottom to
          find. The nav is the flexible middle, so the line that gives way
          first is the one with the most to give. */}
      <div className="container-page flex flex-wrap items-center gap-x-4 gap-y-2.5 py-2.5">
        {/* The copyright carries the brand, so there is no second logo. The
            header's is three lines up the viewport on a page short enough for
            both to be in view at once, and a wordmark is the widest thing
            that was competing for this row. */}
        <p className="text-caption shrink-0 whitespace-nowrap text-muted-foreground">
          &copy; {year} {tBrand('name')}
        </p>

        <nav aria-label={t('explore')} className="min-w-0 flex-1">
          <ul className="flex flex-wrap items-center gap-x-2.5 gap-y-1 lg:justify-center">
            {links.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-caption whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* The newsletter keeps its place in the footer (§7.1 moved it off the
            home page) but not its block: a heading, a line of privacy copy and
            a form, stacked, was a third of the old footer's height for a field
            most readers scroll past. One field and an arrow.

            §6.6 put the language switcher and theme control down here so they
            are reachable without opening anything, and that still holds below
            xl — but that is exactly the breakpoint where the header starts
            rendering its own pair (they are `hidden xl:flex` up there). Two
            copies on screen at once is the one case where they cost width
            without buying reach, so this pair stops where the header's
            begins. */}
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <NewsletterForm locale={locale} source="footer" className="w-40" />
          <span className="flex items-center gap-2 xl:hidden">
            <LocaleSwitcher />
            <ThemeToggle />
          </span>
        </div>
      </div>
    </footer>
  );
}
