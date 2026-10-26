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
    name: 'Explore Tanzania',
    short_name: 'Explore TZ',
    description: 'Safari quotes from licensed Tanzanian operators. Free, no booking fees.',
    start_url: '/',
    display: 'standalone',
    theme_color: '#0A6B4F',
    background_color: '#FFFFFF',
    // §12 asks for PNGs at 192, 512 and a maskable 512, and this repository has
    // none — `public/` holds logo.svg and nothing raster. Pointing the manifest
    // at three files that 404 is worse than pointing it at one that exists, so
    // it references the SVG, which installs correctly on Android and recent
    // iOS.
    //
    // Still outstanding: the maskable variant. Android crops a plain icon to
    // its own shape, and an icon drawn without the safe-area padding loses its
    // edges on a circular mask — that needs an artwork change, not a code one.
    icons: [{ src: '/logo.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
