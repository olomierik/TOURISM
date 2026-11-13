import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale, getMessages } from 'next-intl/server';
import { Fraunces, Manrope, Noto_Sans_Arabic, Noto_Sans_Devanagari } from 'next/font/google';

import { localeDir, routing, type Locale } from '@/i18n/routing';
import { SiteHeader } from '@/components/layout/site-header';
import { AuthUrlHandler } from '@/components/auth/auth-url-handler';
import { BottomTabBar } from '@/components/layout/bottom-tab-bar';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteRail } from '@/components/layout/site-sidebar';
import { ThemeScript } from '@/components/layout/theme-script';
import { SiteSchema } from '@/components/layout/site-schema';
import { siteUrl, localeAlternates, robotsPolicy } from '@/lib/seo';
import { adsenseClientId } from '@/lib/ads';
import { AdsenseScript } from '@/components/ads/adsense-script';
import { PageFootAd } from '@/components/ads/page-foot-ad';
import { ServiceWorker } from '@/components/pwa/service-worker';
import { splashScreens } from '@/lib/pwa/splash-screens';
import './../globals.css';

// Two families, per design.md §3.2.
//
// One family at heavy weights was G4 in the audit: Plus Jakarta Sans did
// headings, UI and body alike, with card titles at 17/800 and section heads at
// 28-36/800, so nothing separated display from interface from prose. Weight
// was carrying hierarchy that a second family should carry.
//
// Manrope is the UI and body face: variable 400-800, tabular figures for the
// price, rating and count columns, latin-ext for de/fr/it. Preloaded, because
// it paints the first screen.
//
// Fraunces is display only (field-guide restyle, 2026-10; previously Cormorant Garamond) - marketing H1/H2, destination names,
// guide titles, pull quotes. It replaced Instrument Serif in the premium-safari
// redesign (2026-10): a classic Garamond reads as a high-end safari house
// rather than a magazine, and it ships real 500-700 weights, so headings get
// genuine bold outlines instead of a single 400. Not preloaded: it arrives with
// `swap`, so a slow connection gets Manrope first and the serif when it lands.
const manrope = Manrope({
  // cyrillic for the Russian catalogue, added Nov 2026. Without it Russian text
  // falls through to the system stack and a Cyrillic page looks like a
  // different website from the Latin one beside it.
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-sans-src',
  display: 'swap',
  preload: true,
});

/*
 * Scripts Manrope does not cover.
 *
 * Each declares the same CSS variable as Manrope and *replaces* it for its
 * locale rather than sitting beside it: two classes defining --font-sans-src
 * on the same <html> would be decided by stylesheet order, which is not
 * something to leave to chance. So `uiFont` below picks exactly one.
 *
 * Both are preloaded, because for those locales this is the face that paints
 * the first screen — the role Manrope plays everywhere else. Chinese is not
 * here on purpose; see the CJK stack in globals.css.
 */
const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-sans-src',
  display: 'swap',
  preload: true,
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  variable: '--font-sans-src',
  display: 'swap',
  preload: true,
});

/** The one face that defines --font-sans-src for this locale. */
function uiFont(locale: Locale): string {
  if (locale === 'ar') return notoArabic.variable;
  if (locale === 'hi') return notoDevanagari.variable;
  return manrope.variable;
}

const displaySerif = Fraunces({
  subsets: ['latin', 'latin-ext'],
  // Variable font: real 500-700 weights and an optical-size axis, so large
  // headings get the tight display cut and small ones the sturdier text cut.
  axes: ['opsz'],
  style: ['normal', 'italic'],
  variable: '--font-display-src',
  display: 'swap',
  preload: false,
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
  const tHome = await getTranslations({ locale, namespace: 'home' });

  // The homepage's search-result title and snippet. Written for the query, not
  // lifted from the hero: the hero headline is a slogan with a line break in
  // it, and the tagline names no service, so neither told Google what the site
  // does. Pages without their own metadata inherit these too.
  const title = tHome('metaTitle');
  const description = tHome('metaDescription');

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s · ${t('name')}`,
    },
    description,
    alternates: localeAlternates('/', locale),
    openGraph: {
      type: 'website',
      siteName: t('name'),
      title,
      description,
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: robotsPolicy,
    // Installed-app details (2026-10). The manifest itself is app/manifest.ts.
    applicationName: t('name'),
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Explore TZ',
      // iPhone/iPad launch screens: sand canvas, logo and the Fraunces wordmark,
      // light and dark. Generated per device size (iOS ignores any image whose
      // size does not match the screen exactly); list in lib/pwa/splash-screens.ts.
      startupImage: splashScreens,
    },
    icons: { apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }] },
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

export const viewport: Viewport = {
  // Lets the page reach the screen edges on notched phones, so the tab bar and
  // the business action bar can pad themselves with env(safe-area-inset-*)
  // instead of leaving a dead strip above the home indicator. Without it every
  // inset reads 0 on iOS and those paddings do nothing.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FDFCFA' },
    { media: '(prefers-color-scheme: dark)', color: '#211B17' },
  ],
};

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

  const [t, tAuth, messages] = await Promise.all([
    getTranslations({ locale, namespace: 'common' }),
    getTranslations({ locale, namespace: 'auth.completing' }),
    getMessages(),
  ]);

  return (
    /* `dir` is set here and nowhere else. Arabic is the first right-to-left
       locale this site has had, and one attribute on <html> is what makes the
       whole document mirror — provided the CSS underneath uses logical
       properties, which is why components say ps-/pe-/ms-/me- rather than
       pl-/pr-/ml-/mr-. `lang` stays the plain locale code: the hreflang in the
       head carries the script (zh-Hans), but `lang` only has to tell a screen
       reader and a hyphenation engine which language this is. */
    <html
      lang={locale}
      dir={localeDir(locale)}
      suppressHydrationWarning
      className={`${uiFont(locale)} ${displaySerif.variable}`}
    >
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
          {/* Installable + offline (2026-10). Registers only on the live site;
              see components/pwa/service-worker.tsx for where it refuses. */}
          <ServiceWorker>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            {/* Side-menu layout (2026-10-31): the rail is fixed on the left on
                computers, so everything below the header steps aside for it. */}
            <SiteRail />
            <div className="flex flex-1 flex-col lg:ps-[var(--rail-w)]">
            <main id="main" className="flex-1">
              {children}
            </main>
            {/* Every page's ad, after every page's content and before the
                footer. Renders nothing on the routes lib/ads.ts keeps
                ad-free, and nothing at all until ads are switched on. */}
            <PageFootAd />
            <SiteFooter />
            {/* Phones and tablets: Home, Explore, Map, Saved, Account. */}
            <BottomTabBar />
            </div>
          </div>
          </ServiceWorker>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
