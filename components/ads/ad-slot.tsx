import 'server-only';

import { adSlots, adsEnabled, adsenseClientId, type AdSurface } from '@/lib/ads';
import { AdUnit } from './ad-unit';

/**
 * The only component permitted to render an advertisement.
 *
 * Ads are confined to the surfaces in `AdSurface` by construction, not by
 * convention: guides, destination pages and the directory results. A
 * qualified safari enquiry is worth $20-200+ to an operator; an AdSense click
 * is worth cents. Putting ads on a business profile, a package page or
 * anywhere in the quote funnel trades dollars for pennies AND hands the
 * visitor to a competitor mid-decision, so those pages have no surface to
 * name, and rendering there is a type error rather than a judgement call.
 *
 * Renders nothing unless ads are switched on (lib/ads.ts), the surface has an
 * ad unit, and the page allows ads (a sponsored guide can opt out).
 */
export function AdSlot({
  surface,
  allowAds = true,
  className,
}: {
  surface: AdSurface;
  allowAds?: boolean;
  className?: string;
}) {
  const slotId = adSlots[surface];
  if (!adsEnabled || !allowAds || !slotId) return null;

  return (
    <AdUnit clientId={adsenseClientId} slotId={slotId} surface={surface} className={className} />
  );
}
