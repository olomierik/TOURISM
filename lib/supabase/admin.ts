import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { supabaseUrl, getSupabaseSecretKey } from './env';

/**
 * Privileged client. Bypasses Row Level Security entirely.
 *
 * The `server-only` import makes importing this from a client component a build
 * error rather than a runtime leak. Use it only where policy genuinely must be
 * bypassed — admin moderation, lead distribution, webhook handlers — and never
 * as a shortcut around an RLS policy that is merely inconvenient.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(supabaseUrl, getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
