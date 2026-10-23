import { NextResponse, type NextRequest } from 'next/server';

import { locales, defaultLocale } from '@/i18n/routing';
import {
  GOOGLE_COOKIE,
  GOOGLE_COOKIE_PATH,
  authorizeUrl,
  encodeAttempt,
  googleDirectReady,
  isDirectOrigin,
  newAttempt,
} from '@/lib/auth/google';

/**
 * Starts Google sign-in on this site's own domain (lib/auth/google.ts).
 *
 * Remembers a fresh state and nonce in a short-lived httpOnly cookie, scoped to
 * /auth/google so only the callback ever sees it, then sends the browser to
 * Google. Outside /[locale] and the proxy matcher, as /auth/callback is.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  if (!googleDirectReady || !isDirectOrigin(origin)) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  const localeParam = searchParams.get('locale');
  const locale = locales.includes(localeParam as never) ? (localeParam as string) : defaultLocale;

  // Only same-origin relative paths, so this cannot become an open redirect.
  const nextParam = searchParams.get('next');
  const next =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : `/${locale === defaultLocale ? '' : locale}`;

  const attempt = newAttempt(next, locale);
  const response = NextResponse.redirect(authorizeUrl(origin, attempt));
  response.cookies.set(GOOGLE_COOKIE, encodeAttempt(attempt), {
    httpOnly: true,
    secure: origin.startsWith('https://'),
    sameSite: 'lax',
    path: GOOGLE_COOKIE_PATH,
    maxAge: 600,
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
