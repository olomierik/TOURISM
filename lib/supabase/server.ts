import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import type { Database } from './database.types';
import { supabaseUrl, supabasePublishableKey, isSupabaseConfigured } from './env';

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
    global: {
      fetch: (input, init) => {
        if (!isSupabaseConfigured) {
          const urlStr = typeof input === 'string' ? input : (input as Request)?.url || '';
          if (urlStr.includes('/auth/v1/')) {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  data: null,
                  error: { message: 'Supabase unconfigured', status: 401 },
                }),
                {
                  status: 401,
                  headers: { 'Content-Type': 'application/json' },
                },
              ),
            );
          }
          return Promise.resolve(
            new Response(JSON.stringify([]), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Content-Range': '0-0/0',
              },
            }),
          );
        }
        return fetch(input, init).catch((err) => {
          return new Response(
            JSON.stringify({
              data: null,
              error: { message: err?.message || 'Network error', status: 503 },
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        });
      },
    },
  });
}
