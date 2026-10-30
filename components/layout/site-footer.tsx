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

  return (
    <footer className="mt-auto border-t bg-surface">
      <div className="container-page grid gap-10 py-14 sm:py-16 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <Link href="/" className="inline-flex rounded-md">
            <Logo />
            <span className="sr-only">{tBrand('name')}</span>
          </Link>
          <p className="mt-4 max-w-xs font-display text-heading-md italic leading-snug text-foreground/80">
            {t('builtIn')}
          </p>
          <NewsletterForm locale={locale} source="footer" className="mt-6 max-w-sm" />
          <InstallApp variant="compact" className="mt-6" />
        </div>

        <nav aria-label={t('explore')} className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="text-body-sm font-semibold text-foreground">
                {group.title}
              </p>
              <ul className="mt-4 space-y-2.5">
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
        </nav>
      </div>

      <div className="border-t">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-4">
          <p className="text-caption text-muted-foreground">
            &copy; {year} {tBrand('name')}. {t('rights')}
          </p>
          {/* §6.6: language and theme stay reachable without opening anything
              below xl, where the header stops rendering its own pair. */}
          <span className="flex items-center gap-2 xl:hidden">
            <LocaleSwitcher />
            <ThemeToggle />
          </span>
        </div>
      </div>
    </footer>
  );
}
