import { defineRouting } from 'next-intl/routing';

/**
 * Every locale the code knows how to render. The catalogues, fonts, RTL rules
 * and URL tables for all nine stay in the repository.
 */
export const knownLocales = ['en', 'de', 'fr', 'it', 'sw', 'zh', 'ar', 'ru', 'hi'] as const;
export type Locale = (typeof knownLocales)[number];

/**
 * Parked (owner's call, 13 Nov 2026): Chinese, Arabic, Russian and Hindi.
 *
 * Their interface was translated but listings, destinations and guides were
 * not, so every page was a translated menu over English text — "English
 * underneath", which is not what was asked for — and each one added a
 * near-duplicate of the whole site to Google's index. They come back by
 * deleting a code from this list once that language has its own content;
 * nothing else needs to change. Until then proxy.ts sends /zh/…, /ar/…,
 * /ru/… and /hi/… to the same page in English.
 */
export const parkedLocales: readonly Locale[] = ['zh', 'ar', 'ru', 'hi'];

/** The locales the site serves, links to, and lists in its sitemap. */
export const locales: readonly Locale[] = knownLocales.filter((l) => !parkedLocales.includes(l));

export const defaultLocale: Locale = 'en';

/**
 * Human labels + native names for the locale switcher.
 * `hrefLang` is what goes into <link rel="alternate" hreflang="..."> — region-neutral
 * on purpose so we rank in AT/CH (de), BE/CA (fr) and CH (it) as well.
 */
export const localeMeta: Record<
  Locale,
  { label: string; native: string; hrefLang: string; dir?: 'rtl' }
> = {
  en: { label: 'English', native: 'English', hrefLang: 'en' },
  de: { label: 'German', native: 'Deutsch', hrefLang: 'de' },
  fr: { label: 'French', native: 'Français', hrefLang: 'fr' },
  it: { label: 'Italian', native: 'Italiano', hrefLang: 'it' },
  sw: { label: 'Swahili', native: 'Kiswahili', hrefLang: 'sw' },
  // Added Nov 2026 for inbound source markets. hrefLang is region-neutral like
  // the others, with one exception: Chinese needs the script, because zh-Hans
  // and zh-Hant are not interchangeable to a reader and Google treats a bare
  // `zh` as ambiguous. This catalogue is Simplified.
  zh: { label: 'Chinese', native: '中文', hrefLang: 'zh-Hans' },
  ar: { label: 'Arabic', native: 'العربية', hrefLang: 'ar', dir: 'rtl' },
  ru: { label: 'Russian', native: 'Русский', hrefLang: 'ru' },
  hi: { label: 'Hindi', native: 'हिन्दी', hrefLang: 'hi' },
};

/**
 * Writing direction. Arabic is the only right-to-left locale here, and it is
 * the first one this site has ever had, so `dir` is read from the table above
 * rather than hard-coded at the one call site that needs it today — the root
 * <html>. Everything else should use logical CSS properties (ps-/pe-/ms-/me-)
 * and never need to ask.
 */
export function localeDir(locale: Locale): 'ltr' | 'rtl' {
  return localeMeta[locale].dir ?? 'ltr';
}

/** Locales whose interface is translated but whose database content is not. */
const CONTENT_FALLBACK = new Set<Locale>(['sw', 'zh', 'ar', 'ru', 'hi']);

/** Locales that have their own rows in the *_translations tables. */
export type ContentLocale = 'en' | 'de' | 'fr' | 'it';

/**
 * Which language to read database content in.
 *
 * Interface text is translated per locale (messages/*.json), but listings,
 * guides and destinations are written per locale in the database, and five
 * locales have no rows there: Swahili, Chinese, Arabic, Russian and Hindi.
 * Those pages therefore read English content — a translated interface over
 * English descriptions, which is what a reader of any of these languages
 * already gets from most of the web, rather than empty pages.
 *
 * This is the honest shape of the thing rather than a temporary hack: the site
 * has 2,756 approved listings written in English and one person to translate
 * them. When a translation table is filled for a locale, take it out of
 * CONTENT_FALLBACK and it takes over with no other change.
 */
export function contentLocale(locale: Locale): ContentLocale {
  return CONTENT_FALLBACK.has(locale) ? 'en' : (locale as ContentLocale);
}

/**
 * Fills the four locales added in November 2026 with the English URL segment.
 *
 * The rule above — a native slug in every language — was written for German,
 * French, Italian and Swahili, where the translated word is both what a reader
 * searches for and still readable in a shared link. Chinese, Arabic and Hindi
 * break the second half of that: a native-script slug is percent-encoded the
 * moment it leaves the browser, so /zh/目的地 travels as thirty characters of
 * %E7%9B%AE%E7%9A%84%E5%9C%B0 in every WhatsApp message and every backlink. And
 * Latin transliteration breaks the first half — nobody searches "mudidi" or
 * "wijhat". Russian transliteration ("napravleniya") would pass both tests, but
 * one locale's worth of hand-rolled transliteration is not worth the
 * inconsistency, and a wrong one is worse than an English word.
 *
 * So these four carry the English segment under their own prefix:
 * /zh/destinations, /ar/destinations. The locale prefix is what tells a crawler
 * and a reader which language the page is in; the segment is not load-bearing.
 *
 * A route that later earns a native slug simply writes all nine locales out in
 * full instead of calling this.
 */
function englishSegment<const T extends Record<'en' | 'de' | 'fr' | 'it' | 'sw', string>>(
  p: T,
): T & { zh: T['en']; ar: T['en']; ru: T['en']; hi: T['en'] } {
  return { ...p, zh: p.en, ar: p.en, ru: p.en, hi: p.en };
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

  '/destinations': englishSegment({
    en: '/destinations',
    de: '/reiseziele',
    fr: '/destinations',
    it: '/destinazioni',
    sw: '/vivutio',
  }),
  '/destinations/[slug]': englishSegment({
    en: '/destinations/[slug]',
    de: '/reiseziele/[slug]',
    fr: '/destinations/[slug]',
    it: '/destinazioni/[slug]',
    sw: '/vivutio/[slug]',
  }),

  '/directory': englishSegment({
    en: '/directory',
    de: '/verzeichnis',
    fr: '/annuaire',
    it: '/elenco',
    sw: '/orodha',
  }),
  '/business/[slug]': englishSegment({
    en: '/business/[slug]',
    de: '/anbieter/[slug]',
    fr: '/prestataire/[slug]',
    it: '/operatore/[slug]',
    sw: '/biashara/[slug]',
  }),
  '/business/[slug]/claim': englishSegment({
    en: '/business/[slug]/claim',
    de: '/anbieter/[slug]/uebernehmen',
    fr: '/prestataire/[slug]/revendiquer',
    it: '/operatore/[slug]/rivendica',
    sw: '/biashara/[slug]/dai',
  }),
  '/packages/[slug]': englishSegment({
    en: '/packages/[slug]',
    de: '/reisepakete/[slug]',
    fr: '/forfaits/[slug]',
    it: '/pacchetti/[slug]',
    sw: '/vifurushi/[slug]',
  }),

  // "When should I go" — the highest-volume planning question in this niche,
  // and one the site could not answer as a browse until now. The month itself is
  // a localized slug in lib/months.ts, so /de/reisezeit/maerz is the German
  // phrasing of the query rather than an English word under a German prefix.
  '/when-to-go': englishSegment({
    en: '/when-to-go',
    de: '/reisezeit',
    fr: '/quand-partir',
    it: '/quando-andare',
    sw: '/wakati-wa-kwenda',
  }),
  '/when-to-go/[month]': englishSegment({
    en: '/when-to-go/[month]',
    de: '/reisezeit/[month]',
    fr: '/quand-partir/[month]',
    it: '/quando-andare/[month]',
    sw: '/wakati-wa-kwenda/[month]',
  }),

  // Two browses that give the reference content a front door. Events answers
  // "what is on while I am there"; hidden gems answers "where else, then" —
  // and the German and French slugs are the phrases people search in those
  // markets rather than English words behind a locale prefix.
  '/events': englishSegment({
    en: '/events',
    de: '/veranstaltungen',
    fr: '/evenements',
    it: '/eventi',
    sw: '/matukio',
  }),
  '/hidden-gems': englishSegment({
    en: '/hidden-gems',
    de: '/geheimtipps',
    fr: '/tresors-caches',
    it: '/mete-nascoste',
    sw: '/hazina-zilizofichwa',
  }),

  // The one page here whose answer depends on where the reader is standing.
  '/near-me': englishSegment({
    en: '/near-me',
    de: '/in-meiner-naehe',
    fr: '/autour-de-moi',
    it: '/vicino-a-me',
    sw: '/karibu-nami',
  }),

  // The planning hub: one menu item for when to go, trip cost, hidden gems,
  // near me and events (side menu trim, 13 Nov 2026).
  '/plan': englishSegment({
    en: '/plan',
    de: '/planen',
    fr: '/planifier',
    it: '/pianifica',
    sw: '/panga-safari',
  }),

  // "What will it cost" — the second question after "when should I go", and
  // until now answerable only one park at a time.
  '/trip-cost': englishSegment({
    en: '/trip-cost',
    de: '/reisekosten',
    fr: '/budget-voyage',
    it: '/costo-viaggio',
    sw: '/gharama-za-safari',
  }),

  // Commercial combination pages: /safaris/serengeti, /de/safaris/serengeti,
  // /it/safari/cratere-ngorongoro. Both segments come from the database as
  // per-locale slugs, so the pattern itself needs no translation — the
  // localization happens in the data, not here.
  //
  // Declared last among the public routes conceptually, but next-intl matches on
  // the exact pattern rather than declaration order, so a static route like
  // /guides is never shadowed by this.
  '/[category]/[destination]': '/[category]/[destination]',

  // The wildlife guide: an animal library, and each animal's profile. The
  // slug is the same in every language (it is the English common name), the
  // way the month slugs are not — species names are what people search for,
  // and the scientific name on the page covers every language.
  '/wildlife': englishSegment({
    en: '/wildlife',
    de: '/tierwelt',
    fr: '/faune',
    it: '/fauna',
    sw: '/wanyamapori',
  }),
  '/wildlife/[slug]': englishSegment({
    en: '/wildlife/[slug]',
    de: '/tierwelt/[slug]',
    fr: '/faune/[slug]',
    it: '/fauna/[slug]',
    sw: '/wanyamapori/[slug]',
  }),

  '/guides': englishSegment({
    en: '/guides',
    de: '/reisefuehrer',
    fr: '/guides',
    it: '/guide',
    sw: '/miongozo',
  }),
  '/guides/[slug]': englishSegment({
    en: '/guides/[slug]',
    de: '/reisefuehrer/[slug]',
    fr: '/guides/[slug]',
    it: '/guide/[slug]',
    sw: '/miongozo/[slug]',
  }),

  '/search': englishSegment({
    en: '/search',
    de: '/suche',
    fr: '/recherche',
    it: '/ricerca',
    sw: '/tafuta',
  }),
  '/compare': englishSegment({
    en: '/compare',
    de: '/vergleichen',
    fr: '/comparer',
    it: '/confronta',
    sw: '/linganisha',
  }),
  '/request-quote': englishSegment({
    en: '/request-quote',
    de: '/angebot-anfordern',
    fr: '/demande-de-devis',
    it: '/richiedi-preventivo',
    sw: '/omba-bei',
  }),
  // design.md §7.7: the confirmation is its own page, not a state swap inside
  // the form. Its own URL means the success can be linked to, measured as a
  // conversion, and reloaded without the browser offering to resubmit the
  // enquiry — which is what "are you sure you want to resend this form?" after
  // a successful quote request looks like to the person who sent it.
  '/request-quote/sent': englishSegment({
    en: '/request-quote/sent',
    de: '/angebot-anfordern/gesendet',
    fr: '/demande-de-devis/envoyee',
    it: '/richiedi-preventivo/inviata',
    sw: '/omba-bei/imetumwa',
  }),

  // Where a confirmed email lands. Its own route rather than a query string on
  // /login, so the address in the bar says what happened and the page can be
  // linked to, bookmarked and measured.
  '/welcome': englishSegment({
    en: '/welcome',
    de: '/willkommen',
    fr: '/bienvenue',
    it: '/benvenuto',
    sw: '/karibu',
  }),
  '/login': englishSegment({
    en: '/login',
    de: '/anmelden',
    fr: '/connexion',
    it: '/accedi',
    sw: '/ingia',
  }),
  '/register': englishSegment({
    en: '/register',
    de: '/registrieren',
    fr: '/inscription',
    it: '/registrati',
    sw: '/jisajili',
  }),

  // Signed-in surfaces. /account is user-facing so it gets native segments;
  // /dashboard and /admin stay untranslated — they carry no SEO value and
  // localizing them only adds routing surface to maintain.
  '/account': englishSegment({
    en: '/account',
    de: '/konto',
    fr: '/compte',
    it: '/account',
    sw: '/akaunti',
  }),
  '/account/favorites': englishSegment({
    en: '/account/saved',
    de: '/konto/gemerkt',
    fr: '/compte/enregistres',
    it: '/account/salvati',
    sw: '/akaunti/vilivyohifadhiwa',
  }),
  '/account/trips': englishSegment({
    en: '/account/trips',
    de: '/konto/reisen',
    fr: '/compte/voyages',
    it: '/account/viaggi',
    sw: '/akaunti/safari',
  }),
  '/account/sightings': englishSegment({
    en: '/account/sightings',
    de: '/konto/sichtungen',
    fr: '/compte/observations',
    it: '/account/avvistamenti',
    sw: '/akaunti/wanyama-niliowaona',
  }),
  '/review/[token]': englishSegment({
    en: '/review/[token]',
    de: '/bewertung/[token]',
    fr: '/avis/[token]',
    it: '/recensione/[token]',
    sw: '/tathmini/[token]',
  }),
  '/enquiry/[reference]': englishSegment({
    en: '/enquiry/[reference]',
    de: '/anfrage/[reference]',
    fr: '/demande/[reference]',
    it: '/richiesta/[reference]',
    sw: '/ombi/[reference]',
  }),
  '/account/enquiries': englishSegment({
    en: '/account/enquiries',
    de: '/konto/anfragen',
    fr: '/compte/demandes',
    it: '/account/richieste',
    sw: '/akaunti/maombi',
  }),
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
  '/admin/leads/[id]': '/admin/leads/[id]',
  '/admin/featured': '/admin/featured',
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

  // The public enquiry board: anonymised traveller requests, shown to the
  // operators the site sells leads and placement to.
  '/travel-requests': englishSegment({
    en: '/travel-requests',
    de: '/reiseanfragen',
    fr: '/demandes-de-voyage',
    it: '/richieste-di-viaggio',
    sw: '/maombi-ya-safari',
  }),
  '/about': englishSegment({
    en: '/about',
    de: '/ueber-uns',
    fr: '/a-propos',
    it: '/chi-siamo',
    sw: '/kuhusu',
  }),
  '/contact': englishSegment({
    en: '/contact',
    de: '/kontakt',
    fr: '/contact',
    it: '/contatti',
    sw: '/wasiliana',
  }),
  '/privacy': englishSegment({
    en: '/privacy',
    de: '/datenschutz',
    fr: '/confidentialite',
    it: '/privacy',
    sw: '/faragha',
  }),
  '/terms': englishSegment({
    en: '/terms',
    de: '/agb',
    fr: '/conditions',
    it: '/termini',
    sw: '/masharti',
  }),
  '/refunds': englishSegment({
    en: '/refunds',
    de: '/rueckerstattungen',
    fr: '/remboursements',
    it: '/rimborsi',
    sw: '/marejesho',
  }),
  /**
   * Paddle's default payment link.
   *
   * The English form is the one that matters: Paddle stores a single default
   * URL per account and appends `?_ptxn=` to it, so `/pay` is what gets
   * configured and approved in their dashboard. The other locales are here so
   * the path behaves like every other route rather than being a hole in the
   * map, not because Paddle will ever send anyone to them.
   */
  '/pay': englishSegment({
    en: '/pay',
    de: '/bezahlen',
    fr: '/payer',
    it: '/paga',
    sw: '/lipa',
  }),
  /**
   * Deliberately not "/licence-register". The data behind this page is a
   * third-party compilation of trade-association registers, not a government
   * licence register, and a URL claiming otherwise would outlive any caveat in
   * the copy — URLs get quoted, shared and screenshotted without the page.
   */
  '/operator-registers': englishSegment({
    en: '/operator-registers',
    de: '/anbieterregister',
    fr: '/registres-operateurs',
    it: '/registri-operatori',
    sw: '/madaftari-ya-watoa-huduma',
  }),
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
