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
 * Where an ad may appear. Editorial and browsing pages only: a business
 * profile, a package page and the quote form stay ad-free, because there the
 * visitor is deciding whom to contact, and an ad worth cents would hand them
 * to someone else at the moment an enquiry is worth $20-200 to the operator.
 */
export type AdSurface = 'guide-body' | 'destination-page' | 'directory-feed';

/**
 * One AdSense ad unit per surface, created in the AdSense dashboard. A surface
 * without a unit ID shows nothing, so each placement is switched on by giving
 * it a unit.
 */
export const adSlots: Record<AdSurface, string | undefined> = {
  'guide-body': process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE,
  'destination-page': process.env.NEXT_PUBLIC_ADSENSE_SLOT_DESTINATION,
  'directory-feed': process.env.NEXT_PUBLIC_ADSENSE_SLOT_DIRECTORY,
};
