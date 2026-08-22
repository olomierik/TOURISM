import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { supabaseUrl, supabasePublishableKey } from './env';

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
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
