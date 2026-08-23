import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';

import { locales, defaultLocale } from '@/i18n/routing';
import { supabaseUrl, supabasePublishableKey } from '@/lib/supabase/env';

/**
 * Confirms an email link that carries a token hash directly.
 *
 * This is the more robust of the two confirmation paths, and it exists because
 * the other one depends on project configuration that can silently break.
 *
 * The default Supabase email template links to the project's own /auth/v1/verify
 * endpoint, which verifies the token and then redirects to `emailRedirectTo` —
 * but ONLY if that URL appears in the project's redirect allow-list. When it does
 * not, Supabase discards it and substitutes the project's Site URL instead, with
 * no error anywhere. A project still carrying the default Site URL therefore
 * sends every confirmed user to http://localhost:3000, which is a dead link on
 * anyone else's machine. That is exactly what happened here.
 *
 * Pointing the email template at this route instead removes that dependency
 * altogether: the link goes straight to our own domain, so there is no redirect
 * for the allow-list to reject. Set the confirmation template to
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 *
 * Lives outside app/[locale] and is excluded from the proxy matcher: a locale
 * rewrite here would corrupt the token before it can be verified.
 */
const OTP_TYPES: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const typeParam = searchParams.get('type');
  const type = OTP_TYPES.includes(typeParam as EmailOtpType)
    ? (typeParam as EmailOtpType)
    : null;

  const localeParam = searchParams.get('locale');
  const locale = locales.includes(localeParam as never) ? localeParam : defaultLocale;

  // Same-origin relative paths only, so this cannot become an open redirect.
  const nextParam = searchParams.get('next');
  const next =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : `/${locale === defaultLocale ? '' : locale}`;

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

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

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    console.error('[auth confirm] verify failed', error.message);
    return NextResponse.redirect(`${origin}/login?error=confirm_failed`);
  }

  return response;
}
