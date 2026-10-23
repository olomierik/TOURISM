import Script from 'next/script';

import { adsEnabled, adsenseClientId } from '@/lib/ads';

/**
 * The AdSense loader, once per page, while ads are switched on.
 *
 * Site-wide rather than per ad unit so AdSense's Auto ads and its consent
 * message (Privacy & messaging, for visitors in the EEA, UK and Switzerland)
 * work from the dashboard without code changes. Loaded after the page is
 * interactive, so it never competes with the content for the first paint.
 */
export function AdsenseScript() {
  if (!adsEnabled) return null;
  return (
    <Script
      id="adsbygoogle-init"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
    />
  );
}
