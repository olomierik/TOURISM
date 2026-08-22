'use client';

import { createBrowserClient } from '@supabase/ssr';

import type { Database } from './database.types';
import { supabaseUrl, supabasePublishableKey } from './env';

/**
 * Browser client. Reads and writes the auth cookies that the server client and
 * proxy also see, so a session established here is visible to server components
 * on the very next request.
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
