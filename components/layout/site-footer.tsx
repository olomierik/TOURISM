import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/layout/logo';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NewsletterForm } from '@/components/newsletter/newsletter-form';
import type { Locale } from '@/i18n/routing';
import { InstallApp } from '@/components/pwa/install-app';

export async function SiteFooter() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('footer');
  const tNav = await getTranslations('nav');
  const tBrand = await getTranslations('brand');
  const year = new Date().getFullYear();

  /* Premium-safari redesign (2026-10): the one-line footer becomes a
     grouped footer, the way the safari houses and marketplaces travellers
     compare us with close a page. Every link the single row carried is still
     here, server-rendered, under the same labels and routes as the header —
     the planning pages keep their only server-rendered path (the header's
     Plan menu is a Radix dropdown that renders nothing until opened). Nothing
     was added that needs a new route or a new message key. */
  const groups = [
    {
      title: t('plan'),
      links: [
        { href: '/directory', label: tNav('directory') },
        { href: '/destinations', label: tNav('destinations') },
        { href: '/when-to-go', label: tNav('whenToGo') },
        { href: '/trip-cost', label: tNav('tripCost') },
        { href: '/hidden-gems', label: tNav('hiddenGems') },
        { href: '/near-me', label: tNav('nearMe') },
      ],
    },
    {
      title: t('forBusiness'),
      links: [{ href: { pathname: '/register', query: { as: 'business' } }, label: t('listBusiness') }],
    },
    {
      title: t('company'),
      links: [
        { href: '/about', label: tNav('about') },
        { href: '/contact', label: tNav('contact') },
      ],
    },
    {
      title: t('legal'),
      links: [
        { href: '/privacy', label: t('privacy') },
        { href: '/terms', label: t('terms') },
      ],
    },
  ] as const;

  /* Compact footer (2026-10). It stood ~900px tall on a phone - a screen
     and a bit of logo, slogan, newsletter, install card and four stacked
     link columns. Now: logo with language/theme, every link in one wrapped
     block, the email field on one row, and the copyright. Same links, same
     routes, same forms; on a computer the groups keep their columns. */
  return (
    <footer className="mt-auto border-t bg-surface">
      <div className="container-page grid gap-5 py-6 sm:gap-8 sm:py-10 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="inline-flex rounded-md">
              <Logo />
              <span className="sr-only">{tBrand('name')}</span>
            </Link>
            {/* §6.6: language and theme stay reachable below xl, where the
                header stops rendering its own pair. */}
            <span className="flex items-center gap-1 xl:hidden">
              <LocaleSwitcher />
              <ThemeToggle />
            </span>
          </div>
          <p className="hidden max-w-xs font-display text-heading-sm italic leading-snug text-foreground/80 lg:block">
            {t('builtIn')}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start lg:flex-col">
            <NewsletterForm locale={locale} source="footer" className="w-full sm:max-w-sm" />
            <InstallApp variant="inline" />
          </div>
        </div>

        <nav aria-label={t('explore')} className="lg:col-span-8">
          {/* Phone: one wrapped block of links, no group titles. */}
          <ul className="flex flex-wrap gap-x-4 gap-y-1 sm:hidden">
            {groups.flatMap((group) =>
              group.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-9 items-center text-body-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              )),
            )}
          </ul>

          {/* Tablet and up: the grouped columns. */}
          <div className="hidden grid-cols-4 gap-6 sm:grid">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="text-body-sm font-semibold text-foreground">{group.title}</p>
                <ul className="mt-3 space-y-1.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-body-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      </div>

      <div className="border-t">
        <div className="container-page py-3">
          <p className="text-caption text-muted-foreground">
            &copy; {year} {tBrand('name')}. {t('rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
