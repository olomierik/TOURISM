import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/layout/logo';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NewsletterForm } from '@/components/newsletter/newsletter-form';
import type { Locale } from '@/i18n/routing';

export async function SiteFooter() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('footer');
  const tNewsletter = await getTranslations('home.newsletter');
  const tNav = await getTranslations('nav');
  const tBrand = await getTranslations('brand');
  const year = new Date().getFullYear();

  const columns = [
    {
      heading: t('explore'),
      /* The same labels the header uses, pointing at the same routes.
      
         That is the whole of G7: a reader met "Businesses" in the bar and
         "Directory" down here for one page, and "Places" against
         "Destinations" for another. §8.1 gives each concept one name, and the
         acceptance test for this phase is that the three places a label
         appears — header, footer, breadcrumb — cannot disagree in any of the
         five locales. */
      links: [
        { href: { pathname: '/directory', query: { category: 'safaris' } }, label: tNav('safaris') },
        { href: { pathname: '/directory', query: { category: 'hotels' } }, label: tNav('stays') },
        { href: { pathname: '/directory', query: { category: 'car-rental' } }, label: tNav('transfers') },
        { href: '/directory', label: tNav('directory') },
        { href: '/destinations', label: tNav('destinations') },
      ],
    },
    /* The planning pages, which until now existed nowhere in the served HTML.
    
       They live in the header's "Plan" menu, and that menu is a Radix
       DropdownMenu — its content is not rendered until somebody opens it. So
       /when-to-go and its twelve month pages, /trip-cost, /hidden-gems and
       /near-me appeared zero times in the markup of every page on the site: no
       crawler had a route to them, and nobody who did not think to open the
       menu knew they existed.
    
       The header keeps the menu; grouping them there was a deliberate call,
       because flat in the bar they overflowed it at 1280px. This is the
       server-rendered path alongside it, which is all they were missing. */
    {
      heading: t('plan'),
      links: [
        { href: '/when-to-go', label: tNav('whenToGo') },
        { href: '/trip-cost', label: tNav('tripCost') },
        { href: '/hidden-gems', label: tNav('hiddenGems') },
        { href: '/near-me', label: tNav('nearMe') },
      ],
    },
    {
      heading: t('forBusiness'),
      links: [
        { href: { pathname: '/register', query: { as: 'business' } }, label: t('listBusiness') },
        { href: '/login', label: t('businessLogin') },
      ],
    },
    {
      heading: t('company'),
      links: [
        { href: '/about', label: tNav('about') },
        { href: '/contact', label: tNav('contact') },
      ],
    },
    {
      heading: t('legal'),
      links: [
        { href: '/privacy', label: t('privacy') },
        { href: '/terms', label: t('terms') },
      ],
    },
  ] as const;

  // §6.6: the footer sits on --surface-muted, at full strength. It was
  // bg-muted/40 — the same token diluted to 40%, a value that lands between
  // the page and the band and reads as neither.
  return (
    <footer className="mt-auto border-t bg-surface-muted">
      <div className="container-page py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {tBrand('tagline')}. {t('builtIn')}
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-foreground">
                {col.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* §7.1 moves the newsletter off the homepage, and §6.6 says where it
            goes: here. It was a full-width band near the foot of the home page
            — a form asking for an email address from someone who has not yet
            been given a reason to care. In the footer it is available to
            anyone who scrolled this far, which is the audience that ever
            wanted it. */}
        <div className="mt-12 border-t pt-8 lg:max-w-md">
          <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-foreground">
            {tNewsletter('title')}
          </h2>
          <p className="mt-2 text-body-sm text-muted-foreground">{tNewsletter('privacy')}</p>
          <NewsletterForm locale={locale} source="footer" className="mt-3" />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-body-sm text-muted-foreground">
          <p>
            &copy; {year} {tBrand('name')}. {t('rights')}
          </p>
          {/* §6.6: the language switcher and theme control live in the footer
              as well as the mobile menu, so they are reachable without opening
              anything on a desktop. */}
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
