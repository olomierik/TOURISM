import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Next 16 renamed the `middleware` file convention to `proxy`. next-intl's
// createMiddleware is still the correct factory — only the filename changed.
export default createMiddleware(routing);

export const config = {
  // Run on everything except Next internals, the API surface, and any path that
  // looks like a static file (contains a dot). Keeps sitemap.xml/robots.txt and
  // image assets out of the locale-rewrite path.
  //
  // The doubled backslash is load-bearing: in a JS string '\\.' produces the
  // regex escape \. (a literal dot). A single backslash would collapse to a bare
  // dot, matching any character and silently disabling this exclusion.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
