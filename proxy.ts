import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';

import { routing, locales, defaultLocale, type Locale } from './i18n/routing';
import { getPathname } from './i18n/navigation';

const handleI18n = createMiddleware(routing);

/** Routes that require a session, and the roles that unlock them. */
const PROTECTED = [
  { href: '/admin', roles: ['admin'] },
  { href: '/dashboard', roles: ['business_owner', 'admin'] },
  { href: '/account', roles: ['traveler', 'business_owner', 'admin'] },
] as const;

/**
 * Precomputed localized prefixes for every protected route.
 *
 * The request arrives carrying the *localized* path (/de/konto), not the internal
 * one (/account), so matching against internal hrefs silently fails to protect
 * anything outside English. Resolving every locale's form up front keeps the
 * per-request check to a string comparison.
 */
const PROTECTED_PATHS: Array<{ path: string; locale: Locale; roles: readonly string[] }> =
  PROTECTED.flatMap((rule) =>
    locales.map((locale) => ({
      path: getPathname({ href: rule.href, locale }),
      locale,
      roles: rule.roles,
    })),
  );

function matchProtected(pathname: string) {
  return PROTECTED_PATHS.find(
    (r) => pathname === r.path || pathname.startsWith(`${r.path}/`),
  );
}

/** Which locale is this request being served in? */
function localeOf(pathname: string): Locale {
  const [, first] = pathname.split('/');
  return locales.includes(first as Locale) ? (first as Locale) : defaultLocale;
}

export default async function proxy(request: NextRequest) {
  // next-intl resolves the locale and may rewrite or redirect. Everything after
  // this must preserve the response it produced, or the locale is lost.
  const response = handleI18n(request);

  // Session refresh has to run on every request: access tokens are short-lived,
  // and without a refresh here a user appears signed out to server components
  // shortly after signing in.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
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
    },
  );

  const pathname = request.nextUrl.pathname;
  const rule = matchProtected(pathname);

  // Public route: skip the auth round-trip entirely. getUser() hits the auth
  // server, so doing it on every static page would add latency to the pages that
  // matter most for SEO.
  if (!rule) return response;

  // getUser, not getSession: getSession trusts whatever is in the cookie, which
  // a client can forge. getUser revalidates against the auth server, and this
  // decides whether someone reaches /admin.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const locale = localeOf(pathname);

  if (!user) {
    const url = request.nextUrl.clone();
    // Send them to the login page *in their own language*, and bring them back
    // to where they were headed once signed in.
    url.pathname = getPathname({ href: '/login', locale });
    url.search = '';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !rule.roles.includes(profile.role)) {
    // Wrong role renders a 404 rather than a 403: confirming that /admin exists
    // tells an attacker something they should not learn from a probe.
    return NextResponse.rewrite(new URL('/not-found', request.url));
  }

  return response;
}

export const config = {
  // Excludes Next internals, the API surface, the auth callback (a route handler
  // that must not be locale-rewritten), and anything that looks like a static
  // file. The doubled backslash is load-bearing: in a JS string '\\.' produces
  // the regex escape \. — a single backslash would collapse to a bare dot,
  // matching any character and silently disabling the exclusion.
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
