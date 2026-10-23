import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { supabaseUrl, supabasePublishableKey } from '@/lib/supabase/env';
import {
  GOOGLE_COOKIE,
  GOOGLE_COOKIE_PATH,
  decodeAttempt,
  exchangeCode,
  isDirectOrigin,
  sameState,
} from '@/lib/auth/google';

/**
 * Where Google sends people back to (lib/auth/google.ts).
 *
 * Checks the state against the cookie the start route set, swaps the code for
 * Google's ID token, and has Supabase sign the person in from it, which sets
 * the same session cookies /auth/callback does.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const attempt = decodeAttempt(request.cookies.get(GOOGLE_COOKIE)?.value);

  const finish = (to: string) => {
    const res = NextResponse.redirect(to);
    res.cookies.set(GOOGLE_COOKIE, '', { path: GOOGLE_COOKIE_PATH, maxAge: 0 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  };
  const fail = (reason: string) => {
    console.error('[auth google] sign-in failed:', reason);
    return finish(`${origin}/login?error=oauth_failed`);
  };

  // Closing Google's window or pressing Cancel is not an error worth a banner.
  if (searchParams.get('error') === 'access_denied') return finish(`${origin}/login`);

  if (!isDirectOrigin(origin)) return fail('unexpected origin');
  if (!attempt) return fail('no attempt cookie (expired, or started on another host)');

  const state = searchParams.get('state') ?? '';
  if (!sameState(state, attempt.state)) return fail('state mismatch');

  const code = searchParams.get('code');
  if (!code) return fail(searchParams.get('error') ?? 'no code');

  const idToken = await exchangeCode(origin, code);
  if (!idToken) return fail('code exchange');

  const response = finish(`${origin}${attempt.next}`);

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
    nonce: attempt.nonce,
  });
  if (error) return fail(`supabase: ${error.message}`);

  return response;
}
