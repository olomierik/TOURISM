import { locales, type Locale } from '@/i18n/routing';

/**
 * Which locales the long-tail routes are built ahead of time for.
 *
 * Every route here keeps `dynamicParams` at its default, so a locale left out
 * of this list is not missing: the first request for it renders the page,
 * caches it, and every request after that is served from the cache like any
 * other. The only cost is that one first visitor waits, and the only pages
 * affected are individual listings and category-in-destination combinations —
 * the tail where most URLs are never opened in a given week.
 *
 * It exists because the build was building all of them. 3,336 approved
 * listings and ~160 populated combinations across five locales came to 3,024
 * prerendered pages, each firing a dozen Supabase reads; past the thousandth
 * page the connection pool gave out and the deploy died (lib/queries/transient.ts
 * has the full account). Building the tail in English only, and the rest for
 * every locale, is roughly 900 pages — enough that the database keeps up and
 * the build finishes inside Netlify's window, without any page ceasing to
 * exist or becoming unindexable.
 *
 * Destination pages are deliberately NOT in the tail. They are the SEO surface
 * the site is built around and there are only 65 of them, so they are prebuilt
 * in all five locales as before.
 *
 * Set PRERENDER_ALL_LOCALES=true to go back to building everything, for a host
 * with a database that can take it.
 */
export const prerenderLocales: readonly Locale[] =
  process.env.PRERENDER_ALL_LOCALES === 'true' ? locales : (['en'] as const);
