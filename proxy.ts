import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';

import { routing, locales, parkedLocales, defaultLocale, type Locale } from './i18n/routing';
import { getPathname } from './i18n/navigation';
import { isSupabaseConfigured } from './lib/supabase/env';

const handleI18n = createMiddleware(routing);

const PARKED_PREFIX = new RegExp(`^/(${parkedLocales.join('|')})(/.*)?$`);

/** Routes that require a session, and the roles that unlock them. */
const PROTECTED = [
  { href: '/admin', roles: ['admin'] },
  // Admins only since 2026-11-09 (owner's call): the anonymised enquiry board.
  { href: '/travel-requests', roles: ['admin'] },
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

/**
 * The one address the site should be found at: NEXT_PUBLIC_SITE_URL, which is
 * https://exploretanzania.online — the bare domain — in production.
 *
 * This said www until the canonical moved to the apex, and the comment outlived
 * the decision. That is not a harmless slip in a file whose whole job is to
 * name one address: Netlify 301s www to the apex, the canonical tags point at
 * the apex, and a reader who believed this comment would have "fixed" one of
 * those to match the other and reopened the split.
 *
 * The split is real and still visible. Search Console on 2026-11-07 holds three
 * properties for this site: sc-domain:exploretanzania.online (902 indexed),
 * https://www.exploretanzania.online/ (894) and https://exploretanzania.online/
 * (8). Nearly everything Google has indexed is still on the old www address and
 * will move across as it recrawls the 301s. Nothing here needs to change for
 * that to happen; it just has to stay pointed at the apex.
 *
 * The same pages also answered at Railway's own web-production-….up.railway.app
 * address. To a search engine that is copies of every page competing with each
 * other, and a link shared from the wrong one keeps the wrong address alive.
 * Every page request on another host is sent permanently to the same path here.
 *
 * Not redirected: local development, Railway's health check (it asks for
 * /robots.txt, which this proxy never sees anyway), and everything the matcher
 * below excludes — /api (webhooks must not be bounced) and /auth (a link in an
 * email must finish on the host that issued it).
 */
const CANONICAL = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? '');
    return url.hostname === 'localhost' ? null : url;
  } catch {
    return null;
  }
})();

function toCanonicalHost(request: NextRequest): NextResponse | null {
  if (!CANONICAL) return null;
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
  if (!host || host === CANONICAL.hostname) return null;
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host.endsWith('.localhost') ||
    host.endsWith('.railway.internal') ||
    host === 'healthcheck.railway.app'
  ) {
    return null;
  }
  const target = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, CANONICAL.origin);
  // 301 for page loads; 308 keeps a form post (a server action) a post.
  const method = request.method.toUpperCase();
  return NextResponse.redirect(target, method === 'GET' || method === 'HEAD' ? 301 : 308);
}

export default async function proxy(request: NextRequest) {
  const elsewhere = toCanonicalHost(request);
  if (elsewhere) return elsewhere;

  // A parked locale (i18n/routing.ts): the same page in English. Their URLs
  // used English path segments, so dropping the prefix is the whole mapping.
  //
  // 301, not 302, and the reason is the whole point of parking them. A 302 says
  // "this URL is still the right one, come back to it", so Google keeps the
  // /zh/… and /ar/… addresses in its index, keeps crawling them, and passes no
  // signal to the English page. Search Console was still fetching
  // /zh/wildlife/african-rock-python and /ar/destinations/samburu-national-reserve
  // days after the parking — the near-duplicate index that parking existed to
  // remove, still there, still being crawled. A 301 consolidates each one onto
  // the English URL and drops the duplicate.
  //
  // The cost is that a 301 is cached hard, so a locale coming back is not
  // instant for people who saw the redirect. That is the right way round: the
  // duplicate costs crawl budget every day it stands, and un-parking is a day
  // that may never come. Google re-crawls 301s and will follow the URL back to
  // 200 when it does.
  const parked = request.nextUrl.pathname.match(PARKED_PREFIX);
  if (parked) {
    const url = request.nextUrl.clone();
    url.pathname = parked[2] || '/';
    return NextResponse.redirect(url, 301);
  }

  // next-intl resolves the locale and may rewrite or redirect. Everything after
  // this must preserve the response it produced, or the locale is lost.
  const response = handleI18n(request);

  const pathname = request.nextUrl.pathname;
  const rule = matchProtected(pathname);

  // Public route: skip the auth round-trip entirely. getUser() hits the auth
  // server, so doing it on every static page would add latency to the pages that
  // matter most for SEO.
  if (!rule) return response;

  const locale = localeOf(pathname);

  /** Protected routes fail closed: anyone we cannot verify goes to sign-in. */
  const toLogin = () => {
    const url = request.nextUrl.clone();
    // Send them to the login page *in their own language*, and bring them back
    // to where they were headed once signed in.
    url.pathname = getPathname({ href: '/login', locale });
    url.search = '';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  };

  // No auth server to ask means nobody can be verified. This used to let every
  // request through (and trust a client-set "demo_user" cookie), which opened
  // /admin to anyone on a deployment missing its Supabase variables.
  if (!isSupabaseConfigured) return toLogin();

  try {
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

    // getUser, not getSession: getSession trusts whatever is in the cookie, which
    // a client can forge. getUser revalidates against the auth server, and this
    // decides whether someone reaches /admin.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return toLogin();

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
  } catch (err) {
    // An auth outage must not become an open door: an error here used to return
    // the page itself, so /admin rendered for anyone while Supabase was down.
    console.error('[proxy] auth check failed', err);
    return toLogin();
  }
}

export const config = {
  // things-to-do is a route handler that 308s to the canonical
  // /activities/<slug>. Letting next-intl rewrite it first turns that redirect
  // into a 404 for a path the SEO blueprint publishes.
  // Excludes Next internals, the API surface, the auth callback (a route handler
  // that must not be locale-rewritten), and anything that looks like a static
  // file. The doubled backslash is load-bearing: in a JS string '\\.' produces
  // the regex escape \. — a single backslash would collapse to a bare dot,
  // matching any character and silently disabling the exclusion.
  // `_design` joins the exclusions: it is the design-system page (design.md
  // §0.7), it lives outside app/[locale], and it has no user content to
  // translate — without this, next-intl would locale-prefix it into four
  // identical copies and pull it into the SEO surface.
  matcher: ['/((?!api|auth|things-to-do|_next|_vercel|_design|.*\\..*).*)'],
};
