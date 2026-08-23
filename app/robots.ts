import type { MetadataRoute } from 'next';

import { siteUrl, allowIndexing } from '@/lib/seo';

/** Mirrors the sections declared in app/sitemap.ts. */
const SITEMAP_SECTIONS = [
  'static',
  'destinations',
  'categories',
  'combinations',
  'businesses',
  'packages',
  'guides',
] as const;

/**
 * Serves /robots.txt.
 *
 * Until NEXT_PUBLIC_ALLOW_INDEXING is set, this disallows everything — the
 * pre-launch site should not be crawled while most routes are still placeholders.
 * Once live it opens up, keeps crawlers out of authenticated and API surfaces,
 * and points at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  if (!allowIndexing) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // No SEO value and, in the dashboard's case, nothing a crawler should reach.
        disallow: ['/api/', '/admin/', '/dashboard/', '/login', '/register'],
      },
    ],
    // Each section is listed individually. Next's generateSitemaps produces
    // /sitemap/{section}.xml but does NOT create an index at /sitemap.xml, so
    // pointing at that single URL would advertise a 404. Multiple Sitemap
    // directives are valid and give Search Console per-section indexing reports.
    sitemap: SITEMAP_SECTIONS.map((s) => `${siteUrl}/sitemap/${s}.xml`),
    host: siteUrl,
  };
}
