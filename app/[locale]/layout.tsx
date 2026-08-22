import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Inter, Fraunces } from 'next/font/google';

import { routing } from '@/i18n/routing';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { ThemeScript } from '@/components/layout/theme-script';
import { siteUrl, localeAlternates, robotsPolicy } from '@/lib/seo';
import './../globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

// Variable serif with soft terminals — gives the editorial warmth a travel brand
// needs without the stiffness of a display serif. latin-ext covers DE/FR/IT diacritics.
const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: 'brand' });
  const tHome = await getTranslations({ locale, namespace: 'home.hero' });

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${t('name')} — ${t('tagline')}`,
      template: `%s · ${t('name')}`,
    },
    description: tHome('subtitle'),
    alternates: localeAlternates('/', locale),
    openGraph: {
      type: 'website',
      siteName: t('name'),
      title: `${t('name')} — ${t('tagline')}`,
      description: tHome('subtitle'),
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${t('name')} — ${t('tagline')}`,
      description: tHome('subtitle'),
    },
    robots: robotsPolicy,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Opts every page under this layout into static rendering where possible.
  setRequestLocale(locale);

  const t = await getTranslations('common');

  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${fraunces.variable}`}>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            {t('skipToContent')}
          </a>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
