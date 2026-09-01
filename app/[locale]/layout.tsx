import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Inter, Poppins } from 'next/font/google';

import { routing } from '@/i18n/routing';
import { SiteHeader } from '@/components/layout/site-header';
import { AuthUrlHandler } from '@/components/auth/auth-url-handler';
import { SiteFooter } from '@/components/layout/site-footer';
import { ThemeScript } from '@/components/layout/theme-script';
import { SiteSchema } from '@/components/layout/site-schema';
import { siteUrl, localeAlternates, robotsPolicy } from '@/lib/seo';
import './../globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

// Geometric sans for headings. The serif this replaces was warm and editorial
// and read like a magazine — right for a travel journal, wrong for a platform
// people come to in order to find a car hire firm. Poppins is friendly without
// being neutral, which is what keeps the page from looking like a template.
// Only the weights actually used, because Poppins is not a variable font and
// each weight is a separate file on the critical path.
const poppins = Poppins({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-poppins',
  display: 'swap',
  weight: ['500', '600', '700'],
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
    // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to the token from Search Console
    // (Settings -> Ownership verification -> HTML tag) to verify without needing
    // registrar access for a DNS record.
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? {
          verification: {
            google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
          },
        }
      : {}),
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

  const [t, tAuth] = await Promise.all([
    getTranslations('common'),
    getTranslations('auth.completing'),
  ]);

  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
      <head>
        <ThemeScript />
        <SiteSchema />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            {t('skipToContent')}
          </a>
          {/* Catches a sign-in that Supabase redirected here instead of to
              /auth/callback. Renders nothing on an ordinary page view. */}
          <AuthUrlHandler label={tAuth('signingIn')} />
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
