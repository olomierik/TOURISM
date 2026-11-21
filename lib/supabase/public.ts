import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { supabaseUrl, supabasePublishableKey, isSupabaseConfigured } from './env';
import { fetchRetryingTimeouts, retryInit } from './retry';

/**
 * How long a public page may serve data fetched from the database.
 *
 * An hour. It was five minutes, as a trade-off between an admin seeing an
 * approval go live and the site staying fast for crawlers — but nothing an
 * admin or an operator does waits for this window: their actions call
 * revalidatePath, which invalidates at once. What the window actually governs
 * is how often a page nobody edited is rebuilt, and at five minutes that was
 * on nearly every request, because few pages here are visited twice in five
 * minutes. Each rebuild re-ran every query on the page.
 *
 * Measured on 14 November 2026: the listing-card query had run 387,715 times,
 * the database was answering `select 1` in seconds, anon reads were being
 * cancelled at their three-second limit, and the live site returned 504 on
 * /hotels/mount-kenya — the page with the most search impressions it has.
 * Migration 090 made the queries cheap; this makes them twelve times rarer.
 *
 * The cost is that a change made outside the app — a seed script, a row
 * edited in the database — takes up to an hour to show instead of five
 * minutes. A deploy clears everything.
 */
const REVALIDATE_SECONDS = 3600;

function emptyPostgrestResponse(): Response {
  return new Response(JSON.stringify([]), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Range': '0-0/0',
    },
  });
}

/**
 * Read-only client for public content, with no cookie access.
 *
 * The cookie-bound server client in server.ts calls `cookies()`, which opts the
 * whole route into dynamic rendering. Destination pages, the directory and
 * guides are the SEO surface and must stay statically generated, so they read
 * through this instead.
 *
 * It uses the publishable key, so RLS still applies and only approved and
 * published rows are visible — the same rows an anonymous visitor would see,
 * which is exactly right for a page rendered once and served to everyone.
 *
 * ---
 *
 * The custom `fetch` is load-bearing, not decoration.
 *
 * Next patches global fetch and persists responses in .next/cache, INCLUDING
 * across separate builds. supabase-js calls fetch internally, so without an
 * explicit directive its responses are cached indefinitely and a `next build`
 * happily writes brand-new HTML files containing data that is hours old. There
 * is no error and no warning; the only symptom is that content edited in the
 * admin panel never appears on the site.
 *
 * That was observed here: guides rewritten in the database still rendered their
 * previous titles after a full rebuild, and only a manual `rm -rf .next` fixed
 * it. Naming a revalidate window makes the caching explicit and bounded instead
 * of unbounded and invisible.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (input, init) => {
        if (!isSupabaseConfigured) {
          return Promise.resolve(emptyPostgrestResponse());
        }
        return fetchRetryingTimeouts(
          (attempt) =>
            fetch(input, {
              ...retryInit(init, attempt),
              next: { revalidate: REVALIDATE_SECONDS },
            } as RequestInit),
          init,
        ).catch((err) => {
          console.error('[supabase public fetch error]', err.message);
          return emptyPostgrestResponse();
        });
      },
    },
  });
}

/**
 * Read client for queries whose answer depends on what the visitor typed.
 *
 * The cached client above is right for a destination page, which is the same
 * for everyone and changes rarely. It is wrong for search: the response is
 * keyed by the query string, so the first person to search a term freezes that
 * answer for everyone behind it.
 *
 * That is not theoretical. A search for "tanzania" was cached when the
 * directory held four listings, and kept returning nothing long after 1,336
 * were imported — while "lodge", which nobody had searched before the import,
 * returned a full page. A directory that answers from a snapshot of itself is
 * worse than a slow one.
 */
export function createSearchClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (input, init) => {
        if (!isSupabaseConfigured) {
          return Promise.resolve(emptyPostgrestResponse());
        }
        return fetchRetryingTimeouts(
          (attempt) => fetch(input, { ...retryInit(init, attempt), cache: 'no-store' } as RequestInit),
          init,
        ).catch((err) => {
          console.error('[supabase search fetch error]', err.message);
          return emptyPostgrestResponse();
        });
      },
    },
  });
}
