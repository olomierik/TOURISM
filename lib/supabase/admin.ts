import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { supabaseUrl, getSupabaseSecretKey, isSupabaseConfigured } from './env';

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
