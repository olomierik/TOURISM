import 'server-only';

import { adSlotFor, adsEnabled, adsenseClientId, type AdSurface } from '@/lib/ads';
import { AdUnit } from './ad-unit';

/**
 * An ad placed inside a page's own content, by that page.
 *
 * The site-wide placement is PageFootAd, in the locale layout. This is for the
 * extra inventory a long page can carry — between the eighth and ninth
 * directory result, under a destination's packages — where the page itself
 * knows where a break in the content is and a layout cannot.
 *
 * Which routes may show an ad at all is one decision, and it lives in
 * pathAllowsAds (lib/ads.ts) so that the layout placement and this one cannot
 * disagree. Calling AdSlot on an ad-free route would be a bug this component
 * does not catch: put it only where the policy already allows ads.
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
  const slotId = adSlotFor(surface);
  if (!adsEnabled || !allowAds || !slotId) return null;

  return (
    <AdUnit clientId={adsenseClientId} slotId={slotId} surface={surface} className={className} />
  );
}
