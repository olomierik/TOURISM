import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/layout/logo';

export async function SiteFooter() {
  const t = await getTranslations('footer');
  const tNav = await getTranslations('nav');
  const tBrand = await getTranslations('brand');
  const year = new Date().getFullYear();

  const columns = [
    {
      heading: t('explore'),
      links: [
        { href: '/destinations', label: tNav('destinations') },
        { href: '/directory', label: tNav('directory') },
        { href: '/guides', label: tNav('guides') },
      ],
    },
    {
      heading: t('forBusiness'),
      links: [
        { href: '/register', label: t('listBusiness') },
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

  return (
    <footer className="mt-auto border-t bg-muted/40">
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
                  <li key={link.href}>
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

        <div className="mt-12 border-t pt-6 text-sm text-muted-foreground">
          <p>
            &copy; {year} {tBrand('name')}. {t('rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
