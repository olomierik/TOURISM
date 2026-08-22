import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import type { Database } from './database.types';
import { supabaseUrl, supabasePublishableKey } from './env';

/**
 * Server client, scoped to the incoming request's cookies.
 *
 * Uses the publishable key on purpose: server components should read as the
 * signed-in user and stay subject to RLS. Reach for the admin client only when
 * an operation genuinely has to bypass policy.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. That is fine: the proxy
          // refreshes the session on every request, so the write is redundant
          // here rather than lost.
        }
      },
    },
  });
}
