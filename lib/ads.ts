import { allowIndexing } from '@/lib/seo';

/**
 * Advertising settings, read once at build time (NEXT_PUBLIC_*).
 *
 * The site is ready for AdSense before it shows any ad: the publisher ID goes
 * into ads.txt and the `google-adsense-account` meta tag as soon as it is set,
 * which is what AdSense needs to verify the site and approve it. Ads
 * themselves wait for NEXT_PUBLIC_ADS_ENABLED=true, the owner's switch for
 * when traffic makes them worth the space. See docs/ADS.md.
 */

/** The publisher ID, "ca-pub-…". */
export const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? '';

/**
 * Whether ads render at all: the owner's switch, a publisher ID, and indexing
 * on (an unindexed site has no audience, and serving ads to nobody only risks
 * a policy flag).
 */
export const adsEnabled =
  process.env.NEXT_PUBLIC_ADS_ENABLED === 'true' && adsenseClientId !== '' && allowIndexing;

/**
 * Where an ad may appear.
 *
 * `page-foot` is the site-wide one: the last thing in the content column, on
 * every page the policy below allows. The rest are extra inventory on pages
 * long enough to carry it, placed between blocks of content rather than
 * beside a control.
 */
export type AdSurface =
  | 'page-foot'
  | 'directory-feed'
  | 'guide-body'
  | 'destination-page';

/**
 * Routes that never show an ad, matched on the *internal* pathname (next-intl
 * hands us `/request-quote`, not `/de/angebot-anfordern`), so the rule holds
 * in all five locales without listing twenty-five translations.
 *
 * Two different reasons, and it is worth keeping them straight:
 *
 * The funnel — /request-quote, /enquiry, /review, and claiming a listing — is
 * excluded on value. A qualified safari enquiry is worth $20-200 to an
 * operator; an AdSense click is worth cents, and the ad most likely to be
 * shown to somebody half-way through describing a Tanzania trip is a
 * competitor's. Putting ads there sells a dollar for a penny.
 *
 * Everything else is excluded because an ad would be in the way, or has
 * nobody to serve: the signed-in areas are tools their owners are working in,
 * the auth pages are three fields and a button, and /privacy and /terms are
 * the pages an AdSense reviewer reads to check the advertising disclosure —
 * which is a poor place to be running advertising.
 */
const AD_FREE_PREFIXES = [
  '/request-quote',
  '/enquiry',
  '/review',
  '/account',
  '/dashboard',
  '/admin',
  '/login',
  '/signup',
  '/register',
  '/welcome',
  '/privacy',
  '/terms',
] as const;

/** Claiming a listing: /business/[slug]/claim, but not the profile itself. */
const CLAIM_PATH = /^\/business\/[^/]+\/claim\/?$/;

/**
 * May this path carry an ad?
 *
 * Accepts the filled path (`/business/arusha-safaris/claim`) or the template
 * (`/business/[slug]/claim`), because which of the two next-intl returns is
 * not worth depending on — a bracketed segment contains no slash, so one
 * pattern matches both.
 */
export function pathAllowsAds(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (CLAIM_PATH.test(path)) return false;
  return !AD_FREE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * One ad unit covers every surface, and a surface may override it.
 *
 * Creating five ad units to set five environment variables buys reporting
 * granularity that AdSense already gives you per page URL, at the cost of
 * four more things to get wrong before a single ad appears. So
 * NEXT_PUBLIC_ADSENSE_SLOT_DEFAULT switches the whole site on, and a surface
 * that later earns its own unit — the in-feed one on the directory is the
 * likely first — gets it without touching the others.
 */
const DEFAULT_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_DEFAULT;

const SLOT_OVERRIDES: Partial<Record<AdSurface, string | undefined>> = {
  'guide-body': process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE,
  'destination-page': process.env.NEXT_PUBLIC_ADSENSE_SLOT_DESTINATION,
  'directory-feed': process.env.NEXT_PUBLIC_ADSENSE_SLOT_DIRECTORY,
};

/** The ad unit for a surface, or undefined when nothing is configured. */
export function adSlotFor(surface: AdSurface): string | undefined {
  return SLOT_OVERRIDES[surface] || DEFAULT_SLOT || undefined;
}
