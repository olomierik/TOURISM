import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { supabaseUrl, supabasePublishableKey } from './env';

/**
 * How long a public page may serve data fetched from the database.
 *
 * Five minutes is the trade-off between an admin seeing their approval go live
 * and the site staying statically fast for crawlers. Anything urgent is handled
 * separately: the admin actions call revalidatePath, which invalidates
 * immediately rather than waiting for this window.
 */
const REVALIDATE_SECONDS = 300;

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
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          next: { revalidate: REVALIDATE_SECONDS },
        } as RequestInit),
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
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' } as RequestInit),
    },
  });
}
