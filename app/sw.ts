/// <reference lib="webworker" />
/**
 * The service worker (field-guide restyle, 2026-10): installable and usable
 * offline, built by Serwist from this file at /serwist/sw.js.
 *
 * What it keeps, and what it never keeps:
 *   - Public pages, images, fonts and the app's own code are cached as they are
 *     visited, network-first for pages so a reader online always gets today's
 *     version, and an offline reader gets the last one they saw.
 *   - Anything private is network-only and never written to the cache: the
 *     account, dashboard and admin areas, sign-in, every API route, and every
 *     call to the database host. A shared phone must not show the last
 *     person's enquiries to the next one.
 *   - A page never visited, opened offline, gets public/offline.html: plain HTML with no scripts, so
 *     it cannot fail the way an app page does when its code is not cached.
 */
import { defaultCache } from '@serwist/turbopack/worker';
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist';
import { NetworkOnly, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** /account, /en/account, /de/dashboard/... — with or without a locale. */
const PRIVATE_PATH = /^\/(?:[a-z]{2}\/)?(?:account|dashboard|admin|login|register|auth|api)(?:\/|$)/;

const neverCache: RuntimeCaching[] = [
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && PRIVATE_PATH.test(url.pathname),
    handler: new NetworkOnly(),
  },
  {
    // The database and its storage API. Photos from public storage are images
    // and are matched by the image rule below, not by this one.
    matcher: ({ url, request }) =>
      url.hostname.endsWith('.supabase.co') && request.destination !== 'image',
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...neverCache, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: '/offline.html',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();
