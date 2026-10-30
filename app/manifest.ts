import type { MetadataRoute } from 'next';

/**
 * Web app manifest — design.md §12.
 *
 * Name, short name 'Explore TZ', sand theme and background, icons
 * 192/512/maskable. Theme and background match the page canvas so the Android
 * status bar, splash and task switcher read as the site. `short_name` is what fits under a home
 * screen icon — "Explore Tanzania" truncates to "Explore Tanz…" there.
 *
 * A route rather than a static file so it is typed, and so the name and the
 * description stay in one place with the rest of the metadata.
 *
 * `start_url` is `/` and not a locale: the proxy already redirects to the
 * visitor's language, and pinning a locale into the installed app would mean a
 * German reader who installs from /de keeps German even after switching.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Explore Tanzania',
    short_name: 'Explore TZ',
    description: 'Safari quotes from licensed Tanzanian operators, and a wildlife guide that works offline. Free, no booking fees.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // Field-guide restyle (2026-10): sand splash screen and status bar, the same
    // sand the pages paint (viewport themeColor), so opening the installed app
    // does not flash a terracotta bar before the first page arrives. Terracotta
    // comes from the wordmark and buttons.
    theme_color: '#F6EEE3',
    background_color: '#F6EEE3',
    categories: ['travel', 'education'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Drawn with the safe-area padding Android's circular mask needs.
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    shortcuts: [
      { name: 'Wildlife guide', url: '/wildlife', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Get free quotes', url: '/request-quote', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
