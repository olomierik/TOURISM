'use client';

import { usePathname } from '@/i18n/navigation';
import { adSlotFor, adsEnabled, adsenseClientId, pathAllowsAds } from '@/lib/ads';
import { AdUnit } from './ad-unit';

/**
 * The site-wide ad: last thing in the content column, above the footer.
 *
 * This is what "ads on every page" means here, and the position is the whole
 * argument. At the end of the content it is below every heading, every form
 * field and every call to action on the page, so there is no reading order in
 * which it sits between somebody and the thing they came to press — which is
 * the failure mode of the sidebar unit, the in-header leaderboard, and every
 * anchor or vignette format Auto ads will inject if it is left to choose.
 *
 * A client component because the route decides whether it renders, and a
 * layout is not told its own pathname. next-intl's usePathname gives the
 * internal path, so the policy is written once rather than per locale.
 */
export function PageFootAd() {
  const pathname = usePathname();
  const slotId = adSlotFor('page-foot');

  if (!adsEnabled || !slotId || !pathAllowsAds(pathname)) return null;

  return (
    <AdUnit
      clientId={adsenseClientId}
      slotId={slotId}
      surface="page-foot"
      // Shorter than an in-content unit: a horizontal format at the end of a
      // page does not need to reserve the height of a medium rectangle.
      className="container-page my-8 min-h-[120px]"
    />
  );
}
