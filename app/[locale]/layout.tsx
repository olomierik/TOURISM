import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale, getMessages } from 'next-intl/server';
import { Plus_Jakarta_Sans } from 'next/font/google';

import { routing } from '@/i18n/routing';
import { SiteHeader } from '@/components/layout/site-header';
import { AuthUrlHandler } from '@/components/auth/auth-url-handler';
import { SiteFooter } from '@/components/layout/site-footer';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { ThemeScript } from '@/components/layout/theme-script';
import { SiteSchema } from '@/components/layout/site-schema';
import { siteUrl, localeAlternates, robotsPolicy } from '@/lib/seo';
import { adsenseClientId } from '@/lib/ads';
import { AdsenseScript } from '@/components/ads/adsense-script';
import './../globals.css';

// One family for text and headings, as on GetYourGuide, Viator and
// Tripadvisor: a geometric sans set bold for titles reads as a modern
// marketplace, where the Newsreader serif read as an editorial site. Variable,
// so every weight from 200 to 800 arrives in one file. It has tabular figures
// for the rating, price and count columns, and latin-ext for the German,
// French and Italian routes. globals.css points both --font-sans and
// --font-display at it, so the 109 `font-display` call sites keep working.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans-src',
  display: 'swap',
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
    // AdSense's ownership tag. Present whenever a publisher ID is set, ads on
    // or off, so the site can be verified and reviewed before showing ads.
    ...(adsenseClientId ? { other: { 'google-adsense-account': adsenseClientId } } : {}),
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
  console.log('[LocaleLayout] locale is:', locale, 'hasLocale:', hasLocale(routing.locales, locale));
  if (!hasLocale(routing.locales, locale)) notFound();

  // Opts every page under this layout into static rendering where possible.
  setRequestLocale(locale);

  const [t, tAuth, messages] = await Promise.all([
    getTranslations({ locale, namespace: 'common' }),
    getTranslations({ locale, namespace: 'auth.completing' }),
    getMessages(),
  ]);

  return (
    <html lang={locale} suppressHydrationWarning className={jakarta.variable}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ThemeScript />
        <SiteSchema />
        <AdsenseScript />
        <NextIntlClientProvider messages={messages} locale={locale}>
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
            <MobileTabBar />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
