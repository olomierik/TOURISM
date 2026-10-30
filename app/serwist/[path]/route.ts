import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSerwistRoute } from '@serwist/turbopack';

/**
 * Serves the built service worker at /serwist/sw.js (see app/sw.ts).
 *
 * public/offline.html is not part of the build output Serwist scans, so it is
 * added by hand. Its revision is a hash of its contents: a changed offline
 * screen reaches returning browsers, an unchanged one is not re-downloaded.
 */
const offlineRevision = createHash('sha256')
  .update(readFileSync(join(process.cwd(), 'public', 'offline.html')))
  .digest('hex')
  .slice(0, 16);

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: 'app/sw.ts',
  additionalPrecacheEntries: [{ url: '/offline.html', revision: offlineRevision }],
  useNativeEsbuild: true,
  // Precache only the offline screen and the stylesheets. Installing should
  // not cost a phone a 3 MB download of every script in the app; scripts are
  // cached as the pages that use them are opened (runtime rules in app/sw.ts).
  manifestTransforms: [
    (entries) => ({
      manifest: entries.filter((e) => e.url === '/offline.html' || /\.css(?:\?|$)/.test(e.url)),
      warnings: [],
    }),
  ],
});
