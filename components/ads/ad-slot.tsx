import 'server-only';

import { AdUnit } from './ad-unit';

/**
 * The only component permitted to render an advertisement.
 *
 * Ads are confined to editorial routes by construction, not by convention. A
 * qualified safari enquiry is worth $20-200+ to an operator; an AdSense click is
 * worth cents. Putting ads on a business profile, a package page or anywhere in
 * the quote funnel trades dollars for pennies AND hands the visitor to a
 * competitor mid-decision — so `surface` has exactly one legal value, and any
 * attempt to render elsewhere is a type error rather than a judgement call
 * somebody makes at 5pm on a Friday six months from now.
 *
 * Rendering is additionally gated on:
 *   - NEXT_PUBLIC_ADSENSE_CLIENT_ID being configured
 *   - the individual guide allowing ads (a sponsored piece can opt out)
 *   - indexing being enabled, since an unindexed pre-launch site has no
 *     audience and serving ads to nobody only risks an AdSense policy flag
 */
export function AdSlot({
  surface,
  allowAds,
  slotId,
  className,
}: {
  /** Deliberately not widened. Ads belong on editorial content only. */
  surface: 'guide-body';
  allowAds: boolean;
  slotId?: string;
  className?: string;
}) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const indexingEnabled = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';

  if (!clientId || !allowAds || !indexingEnabled) return null;

  return (
    <AdUnit
      clientId={clientId}
      slotId={slotId ?? process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE ?? ''}
      surface={surface}
      className={className}
    />
  );
}
