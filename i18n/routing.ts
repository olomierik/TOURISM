import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'de', 'fr', 'it', 'sw'] as const;
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
  sw: { label: 'Swahili', native: 'Kiswahili', hrefLang: 'sw' },
};

/**
 * Which language to read database content in.
 *
 * Interface text is translated per locale (messages/*.json), but listings,
 * guides and destinations are written per locale in the database, and Swahili
 * has none yet. Swahili pages therefore read English content: a Swahili
 * interface over English descriptions, which is what a Tanzanian reader already
 * gets from most of the web, rather than empty pages. When a Swahili translation
 * table is filled, drop sw from here and it takes over.
 */
export function contentLocale(locale: Locale): Exclude<Locale, 'sw'> {
  return locale === 'sw' ? 'en' : locale;
}

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
    sw: '/vivutio',
  },
  '/destinations/[slug]': {
    en: '/destinations/[slug]',
    de: '/reiseziele/[slug]',
    fr: '/destinations/[slug]',
    it: '/destinazioni/[slug]',
    sw: '/vivutio/[slug]',
  },

  '/directory': {
    en: '/directory',
    de: '/verzeichnis',
    fr: '/annuaire',
    it: '/elenco',
    sw: '/orodha',
  },
  '/business/[slug]': {
    en: '/business/[slug]',
    de: '/anbieter/[slug]',
    fr: '/prestataire/[slug]',
    it: '/operatore/[slug]',
    sw: '/biashara/[slug]',
  },
  '/business/[slug]/claim': {
    en: '/business/[slug]/claim',
    de: '/anbieter/[slug]/uebernehmen',
    fr: '/prestataire/[slug]/revendiquer',
    it: '/operatore/[slug]/rivendica',
    sw: '/biashara/[slug]/dai',
  },
  '/packages/[slug]': {
    en: '/packages/[slug]',
    de: '/reisepakete/[slug]',
    fr: '/forfaits/[slug]',
    it: '/pacchetti/[slug]',
    sw: '/vifurushi/[slug]',
  },

  // "When should I go" — the highest-volume planning question in this niche,
  // and one the site could not answer as a browse until now. The month itself is
  // a localized slug in lib/months.ts, so /de/reisezeit/maerz is the German
  // phrasing of the query rather than an English word under a German prefix.
  '/when-to-go': {
    en: '/when-to-go',
    de: '/reisezeit',
    fr: '/quand-partir',
    it: '/quando-andare',
    sw: '/wakati-wa-kwenda',
  },
  '/when-to-go/[month]': {
    en: '/when-to-go/[month]',
    de: '/reisezeit/[month]',
    fr: '/quand-partir/[month]',
    it: '/quando-andare/[month]',
    sw: '/wakati-wa-kwenda/[month]',
  },

  // Two browses that give the reference content a front door. Events answers
  // "what is on while I am there"; hidden gems answers "where else, then" —
  // and the German and French slugs are the phrases people search in those
  // markets rather than English words behind a locale prefix.
  '/events': {
    en: '/events',
    de: '/veranstaltungen',
    fr: '/evenements',
    it: '/eventi',
    sw: '/matukio',
  },
  '/hidden-gems': {
    en: '/hidden-gems',
    de: '/geheimtipps',
    fr: '/tresors-caches',
    it: '/mete-nascoste',
    sw: '/hazina-zilizofichwa',
  },

  // The one page here whose answer depends on where the reader is standing.
  '/near-me': {
    en: '/near-me',
    de: '/in-meiner-naehe',
    fr: '/autour-de-moi',
    it: '/vicino-a-me',
    sw: '/karibu-nami',
  },

  // "What will it cost" — the second question after "when should I go", and
  // until now answerable only one park at a time.
  '/trip-cost': {
    en: '/trip-cost',
    de: '/reisekosten',
    fr: '/budget-voyage',
    it: '/costo-viaggio',
    sw: '/gharama-za-safari',
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
    sw: '/miongozo',
  },
  '/guides/[slug]': {
    en: '/guides/[slug]',
    de: '/reisefuehrer/[slug]',
    fr: '/guides/[slug]',
    it: '/guide/[slug]',
    sw: '/miongozo/[slug]',
  },

  '/search': {
    en: '/search',
    de: '/suche',
    fr: '/recherche',
    it: '/ricerca',
    sw: '/tafuta',
  },
  '/compare': {
    en: '/compare',
    de: '/vergleichen',
    fr: '/comparer',
    it: '/confronta',
    sw: '/linganisha',
  },
  '/request-quote': {
    en: '/request-quote',
    de: '/angebot-anfordern',
    fr: '/demande-de-devis',
    it: '/richiedi-preventivo',
    sw: '/omba-bei',
  },
  // design.md §7.7: the confirmation is its own page, not a state swap inside
  // the form. Its own URL means the success can be linked to, measured as a
  // conversion, and reloaded without the browser offering to resubmit the
  // enquiry — which is what "are you sure you want to resend this form?" after
  // a successful quote request looks like to the person who sent it.
  '/request-quote/sent': {
    en: '/request-quote/sent',
    de: '/angebot-anfordern/gesendet',
    fr: '/demande-de-devis/envoyee',
    it: '/richiedi-preventivo/inviata',
    sw: '/omba-bei/imetumwa',
  },

  // Where a confirmed email lands. Its own route rather than a query string on
  // /login, so the address in the bar says what happened and the page can be
  // linked to, bookmarked and measured.
  '/welcome': {
    en: '/welcome',
    de: '/willkommen',
    fr: '/bienvenue',
    it: '/benvenuto',
    sw: '/karibu',
  },
  '/login': {
    en: '/login',
    de: '/anmelden',
    fr: '/connexion',
    it: '/accedi',
    sw: '/ingia',
  },
  '/register': {
    en: '/register',
    de: '/registrieren',
    fr: '/inscription',
    it: '/registrati',
    sw: '/jisajili',
  },

  // Signed-in surfaces. /account is user-facing so it gets native segments;
  // /dashboard and /admin stay untranslated — they carry no SEO value and
  // localizing them only adds routing surface to maintain.
  '/account': {
    en: '/account',
    de: '/konto',
    fr: '/compte',
    it: '/account',
    sw: '/akaunti',
  },
  '/account/favorites': {
    en: '/account/saved',
    de: '/konto/gemerkt',
    fr: '/compte/enregistres',
    it: '/account/salvati',
    sw: '/akaunti/vilivyohifadhiwa',
  },
  '/account/trips': {
    en: '/account/trips',
    de: '/konto/reisen',
    fr: '/compte/voyages',
    it: '/account/viaggi',
    sw: '/akaunti/safari',
  },
  '/review/[token]': {
    en: '/review/[token]',
    de: '/bewertung/[token]',
    fr: '/avis/[token]',
    it: '/recensione/[token]',
    sw: '/tathmini/[token]',
  },
  '/enquiry/[reference]': {
    en: '/enquiry/[reference]',
    de: '/anfrage/[reference]',
    fr: '/demande/[reference]',
    it: '/richiesta/[reference]',
    sw: '/ombi/[reference]',
  },
  '/account/enquiries': {
    en: '/account/enquiries',
    de: '/konto/anfragen',
    fr: '/compte/demandes',
    it: '/account/richieste',
    sw: '/akaunti/maombi',
  },
  '/dashboard': '/dashboard',
  '/dashboard/leads': '/dashboard/leads',
  '/dashboard/reviews': '/dashboard/reviews',
  '/dashboard/profile': '/dashboard/profile',
  '/dashboard/packages': '/dashboard/packages',
  '/dashboard/deals': '/dashboard/deals',
  '/dashboard/packages/new': '/dashboard/packages/new',
  '/dashboard/packages/[id]': '/dashboard/packages/[id]',
  '/dashboard/gallery': '/dashboard/gallery',
  '/dashboard/services': '/dashboard/services',
  '/dashboard/analytics': '/dashboard/analytics',
  '/dashboard/payments': '/dashboard/payments',
  '/dashboard/subscription': '/dashboard/subscription',
  '/dashboard/subscription/pay/[reference]': '/dashboard/subscription/pay/[reference]',
  '/admin': '/admin',
  '/admin/payments': '/admin/payments',
  '/admin/engagement': '/admin/engagement',
  '/admin/destinations': '/admin/destinations',
  '/admin/destinations/new': '/admin/destinations/new',
  '/admin/destinations/[id]': '/admin/destinations/[id]',
  '/admin/guides/new': '/admin/guides/new',
  '/admin/guides/[id]': '/admin/guides/[id]',
  '/admin/businesses/new': '/admin/businesses/new',
  '/admin/businesses/[id]': '/admin/businesses/[id]',
  '/admin/businesses': '/admin/businesses',
  '/admin/leads': '/admin/leads',
  '/admin/outreach': '/admin/outreach',
  // Not translated, like the rest of the admin console. Declared here anyway
  // because the typed Link refuses a route it has never heard of, which is the
  // check working.
  '/admin/outreach/unreached': '/admin/outreach/unreached',
  '/admin/messages': '/admin/messages',
  '/admin/subscriptions': '/admin/subscriptions',
  '/admin/reviews': '/admin/reviews',
  '/admin/guides': '/admin/guides',
  '/admin/settings': '/admin/settings',
  '/admin/audit': '/admin/audit',
  '/admin/claims': '/admin/claims',
  '/admin/metrics': '/admin/metrics',

  '/about': {
    en: '/about',
    de: '/ueber-uns',
    fr: '/a-propos',
    it: '/chi-siamo',
    sw: '/kuhusu',
  },
  '/contact': {
    en: '/contact',
    de: '/kontakt',
    fr: '/contact',
    it: '/contatti',
    sw: '/wasiliana',
  },
  '/privacy': {
    en: '/privacy',
    de: '/datenschutz',
    fr: '/confidentialite',
    it: '/privacy',
    sw: '/faragha',
  },
  '/terms': {
    en: '/terms',
    de: '/agb',
    fr: '/conditions',
    it: '/termini',
    sw: '/masharti',
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
