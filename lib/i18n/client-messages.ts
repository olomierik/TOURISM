/**
 * Which interface strings reach the browser.
 *
 * next-intl's client provider ships whatever catalogue it is given, and the
 * root layout gave it all of it: 134 KB of strings serialized into every page,
 * the admin console's and the operator dashboard's included, for a traveller
 * reading a park guide. It was half of the homepage's HTML (135 of 469 KB,
 * measured 21 Nov 2026; SEO brief T4).
 *
 * Server components translate on the server and send text, not catalogues.
 * Only client components (`'use client'` + useTranslations) need strings in
 * the browser, and these lists are exactly the namespaces they read, found by
 * grepping every client file for useTranslations('<namespace>'). Dotted paths
 * send one branch of a namespace.
 *
 * When a client component starts reading a new namespace, add it here, or it
 * renders the key instead of the text. The pick is per layout: public pages
 * get PUBLIC; the dashboard and admin layouts add their own on top.
 */

export const PUBLIC_CLIENT_NAMESPACES = [
  'ads',
  'auth.account',
  'auth.errors',
  'auth.login',
  'auth.register',
  'auth.social',
  'billing',
  'business',
  'claim',
  'claimInvite',
  'common',
  'contact',
  // The pay-the-operator box on a public listing reads the dashboard's copy.
  'dashboard.payments',
  'destination',
  'directory',
  'engagement',
  'favorites',
  'home.newsletter',
  'home.search',
  'interests',
  'map',
  'media',
  'months',
  'nav',
  'nearMe',
  'pay',
  'pwa',
  'quote.errors',
  // The BOOKED button on each quote card (components/messages/book-button.tsx).
  'quoteCompare',
  // Group trips (calculator, request form) and the tour guide sign-up and
  // verification forms.
  'groupTrips',
  'tourGuides',
  'quoteForm',
  'quoteStarter',
  'quoteWizard',
  'reviewInvite',
  'reviews',
  'thread',
  'tours',
  'tripCost',
  'wildlife',
] as const;

export const DASHBOARD_CLIENT_NAMESPACES = ['dashboard', 'dashboardReviews', 'leadCredit'] as const;

export const ADMIN_CLIENT_NAMESPACES = ['admin', 'dashboard', 'dashboardReviews', 'leadCredit'] as const;

type Catalogue = Record<string, unknown>;

/** The named namespaces (or dotted branches) of a catalogue, and nothing else. */
export function pickMessages(messages: Catalogue, paths: readonly string[]): Catalogue {
  const out: Catalogue = {};
  for (const path of paths) {
    const keys = path.split('.');
    let source: unknown = messages;
    for (const k of keys) source = source && typeof source === 'object' ? (source as Catalogue)[k] : undefined;
    if (source === undefined) continue;
    let target = out;
    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        target[k] = source;
      } else {
        // A whole namespace already picked wins over a branch of it.
        if (typeof target[k] !== 'object' || target[k] === null) target[k] = {};
        target = target[k] as Catalogue;
      }
    });
  }
  return out;
}
