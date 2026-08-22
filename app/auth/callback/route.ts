import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { locales, defaultLocale } from '@/i18n/routing';
import { supabaseUrl, supabasePublishableKey } from '@/lib/supabase/env';

/**
 * Email-confirmation and OAuth landing point.
 *
 * Lives outside app/[locale] and is excluded from the proxy matcher, because a
 * locale rewrite here would corrupt the one-time code before it can be exchanged.
 * The originating locale is carried through as a query parameter instead.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const localeParam = searchParams.get('locale');
  const locale = locales.includes(localeParam as never) ? localeParam : defaultLocale;

  // Only same-origin relative paths, so the callback cannot be used as an
  // open redirect to an attacker's site.
  const nextParam = searchParams.get('next');
  const next =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : `/${locale === defaultLocale ? '' : locale}`;

  if (!code) {
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth callback] exchange failed', error.message);
    return NextResponse.redirect(`${origin}/login?error=confirm_failed`);
  }

  return response;
}
