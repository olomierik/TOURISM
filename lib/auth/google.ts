import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { siteUrl } from '@/lib/seo';

/**
 * Google sign-in that Google sees as coming from this site, not from Supabase.
 *
 * Supabase's own flow sends people to Google with Supabase's callback as the
 * redirect URI, so Google's screen reads "continue to <project>.supabase.co".
 * Here the redirect URI is this site's /auth/google/callback: Google shows our
 * domain, the callback swaps the code for an ID token, and Supabase signs the
 * person in from that token (signInWithIdToken). The account and the session
 * are the same either way.
 *
 * Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server, and each
 * origin's /auth/google/callback registered on that client in Google Cloud.
 * Without them, or on any other origin (a deploy preview), sign-in goes through
 * Supabase's flow as before.
 */

export const googleClientId = process.env.GOOGLE_CLIENT_ID ?? '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';

export const googleDirectReady = googleClientId !== '' && googleClientSecret !== '';

export const GOOGLE_COOKIE = 'et_google_oauth';
export const GOOGLE_COOKIE_PATH = '/auth/google';
export const GOOGLE_CALLBACK_PATH = '/auth/google/callback';

/** The site itself, or a local dev server: the origins registered with Google. */
export function isDirectOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    return new URL(origin).origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}

/** What the start route remembers for the callback, in an httpOnly cookie. */
export type GoogleAttempt = { state: string; nonce: string; next: string; locale: string };

export function newAttempt(next: string, locale: string): GoogleAttempt {
  return {
    state: randomBytes(32).toString('base64url'),
    nonce: randomBytes(32).toString('base64url'),
    next,
    locale,
  };
}

export function encodeAttempt(a: GoogleAttempt): string {
  return Buffer.from(JSON.stringify(a)).toString('base64url');
}

export function decodeAttempt(value: string | undefined): GoogleAttempt | null {
  if (!value) return null;
  try {
    const a = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<GoogleAttempt>;
    if (typeof a.state !== 'string' || typeof a.nonce !== 'string') return null;
    if (typeof a.next !== 'string' || typeof a.locale !== 'string') return null;
    return a as GoogleAttempt;
  } catch {
    return null;
  }
}

export function sameState(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Google gets the SHA-256 of the nonce and Supabase the nonce itself: Supabase
 * hashes what it is given and compares it with the nonce inside the ID token.
 */
export function hashNonce(nonce: string): string {
  return createHash('sha256').update(nonce).digest('hex');
}

export function authorizeUrl(origin: string, a: GoogleAttempt): string {
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: `${origin}${GOOGLE_CALLBACK_PATH}`,
    response_type: 'code',
    scope: 'openid email profile',
    state: a.state,
    nonce: hashNonce(a.nonce),
    // Always the account chooser, so someone signed in to several Google
    // accounts is not silently signed in as whichever the browser prefers.
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Swaps the one-time code for Google's ID token. Null on any failure. */
export async function exchangeCode(origin: string, code: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: `${origin}${GOOGLE_CALLBACK_PATH}`,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string };
    if (!res.ok || !body.id_token) {
      console.error('[auth google] code exchange failed', res.status, body.error ?? '');
      return null;
    }
    return body.id_token;
  } catch (err) {
    console.error('[auth google] code exchange failed', err);
    return null;
  }
}
