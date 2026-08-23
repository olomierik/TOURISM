import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'de', 'fr', 'it'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

/**
 * Human labels + native names for the locale switcher.
 * `hrefLang` is what goes into <link rel="alternate" hreflang="..."> — region-neutral
 * on purpose so we rank in AT/CH (de), BE/CA (fr) and CH (it) as well.
 */
export const localeMeta: Record<Locale, { label: string; native: string; hrefLang: string }> = {
  en: { label: 'English', native: 'English', hrefLang: 'en' },
  de: { label: 'German', native: 'Deutsch', hrefLang: 'de' },
  fr: { label: 'French', native: 'Français', hrefLang: 'fr' },
  it: { label: 'Italian', native: 'Italiano', hrefLang: 'it' },
};

/**
 * Localized URL segments. Translated paths measurably outrank generic English
 * segments in non-English search, so every public route carries a native slug.
 *
 * Dynamic `[slug]` values are NOT translated here — those come per-locale from the
 * database (`*_translations.slug`), so /de/reiseziele/serengeti and /it/destinazioni/serengeti
 * can diverge independently of this config.
 *
 * Auth-gated surfaces (/dashboard, /admin) are deliberately absent: they carry no SEO
 * value and localizing them only adds routing surface to maintain.
 */
export const pathnames = {
  '/': '/',

  '/destinations': {
    en: '/destinations',
    de: '/reiseziele',
    fr: '/destinations',
    it: '/destinazioni',
  },
  '/destinations/[slug]': {
    en: '/destinations/[slug]',
    de: '/reiseziele/[slug]',
    fr: '/destinations/[slug]',
    it: '/destinazioni/[slug]',
  },

  '/directory': {
    en: '/directory',
    de: '/verzeichnis',
    fr: '/annuaire',
    it: '/elenco',
  },
  '/business/[slug]': {
    en: '/business/[slug]',
    de: '/anbieter/[slug]',
    fr: '/prestataire/[slug]',
    it: '/operatore/[slug]',
  },
  '/packages/[slug]': {
    en: '/packages/[slug]',
    de: '/reisepakete/[slug]',
    fr: '/forfaits/[slug]',
    it: '/pacchetti/[slug]',
  },

  // Commercial combination pages: /safaris/serengeti, /de/safaris/serengeti,
  // /it/safari/cratere-ngorongoro. Both segments come from the database as
  // per-locale slugs, so the pattern itself needs no translation — the
  // localization happens in the data, not here.
  //
  // Declared last among the public routes conceptually, but next-intl matches on
  // the exact pattern rather than declaration order, so a static route like
  // /guides is never shadowed by this.
  '/[category]/[destination]': '/[category]/[destination]',

  '/guides': {
    en: '/guides',
    de: '/reisefuehrer',
    fr: '/guides',
    it: '/guide',
  },
  '/guides/[slug]': {
    en: '/guides/[slug]',
    de: '/reisefuehrer/[slug]',
    fr: '/guides/[slug]',
    it: '/guide/[slug]',
  },

  '/search': {
    en: '/search',
    de: '/suche',
    fr: '/recherche',
    it: '/ricerca',
  },
  '/compare': {
    en: '/compare',
    de: '/vergleichen',
    fr: '/comparer',
    it: '/confronta',
  },
  '/request-quote': {
    en: '/request-quote',
    de: '/angebot-anfordern',
    fr: '/demande-de-devis',
    it: '/richiedi-preventivo',
  },

  '/login': {
    en: '/login',
    de: '/anmelden',
    fr: '/connexion',
    it: '/accedi',
  },
  '/register': {
    en: '/register',
    de: '/registrieren',
    fr: '/inscription',
    it: '/registrati',
  },

  // Signed-in surfaces. /account is user-facing so it gets native segments;
  // /dashboard and /admin stay untranslated — they carry no SEO value and
  // localizing them only adds routing surface to maintain.
  '/account': {
    en: '/account',
    de: '/konto',
    fr: '/compte',
    it: '/account',
  },
  '/account/enquiries': {
    en: '/account/enquiries',
    de: '/konto/anfragen',
    fr: '/compte/demandes',
    it: '/account/richieste',
  },
  '/dashboard': '/dashboard',
  '/dashboard/leads': '/dashboard/leads',
  '/dashboard/profile': '/dashboard/profile',
  '/dashboard/packages': '/dashboard/packages',
  '/admin': '/admin',
  '/admin/businesses': '/admin/businesses',
  '/admin/leads': '/admin/leads',
  '/admin/reviews': '/admin/reviews',
  '/admin/guides': '/admin/guides',
  '/admin/settings': '/admin/settings',
  '/admin/audit': '/admin/audit',

  '/about': {
    en: '/about',
    de: '/ueber-uns',
    fr: '/a-propos',
    it: '/chi-siamo',
  },
  '/contact': {
    en: '/contact',
    de: '/kontakt',
    fr: '/contact',
    it: '/contatti',
  },
  '/privacy': {
    en: '/privacy',
    de: '/datenschutz',
    fr: '/confidentialite',
    it: '/privacy',
  },
  '/terms': {
    en: '/terms',
    de: '/agb',
    fr: '/conditions',
    it: '/termini',
  },
} satisfies Parameters<typeof defineRouting>[0]['pathnames'];

export const routing = defineRouting({
  locales,
  defaultLocale,
  // English serves from the root (/destinations) while other locales are prefixed
  // (/de/reiseziele). Cleaner URLs for the primary market without losing the others.
  localePrefix: 'as-needed',
  pathnames,
});

/**
 * Params shape for every page under app/[locale]. generateStaticParams only ever
 * emits known locales and the layout 404s on anything else, so narrowing here
 * saves a redundant check in every page component.
 */
export type LocaleParams = { locale: Locale };
