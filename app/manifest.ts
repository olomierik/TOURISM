import type { MetadataRoute } from 'next';

/**
 * Web app manifest — design.md §12.
 *
 * "name, short_name 'Explore TZ', theme #0A6B4F, background #FFFFFF, icons
 * 192/512/maskable."
 *
 * The theme colour is Acacia-600, the same token the primary button uses, so
 * the Android status bar and the task switcher match the site rather than
 * falling back to a browser default. `short_name` is what fits under a home
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
    // Field-guide restyle (2026-10): terracotta bar, sand splash screen.
    theme_color: '#A8552F',
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
