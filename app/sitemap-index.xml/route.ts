import robots from '@/app/robots';

/**
 * The sitemap index, served at /sitemap.xml (rewritten in next.config.ts).
 *
 * The list comes from robots.txt's own Sitemap lines rather than a third copy
 * of the section names, so the index can never advertise a different set from
 * robots.txt. While indexing is switched off robots lists no sitemaps, and
 * the index is empty to match.
 */
export const dynamic = 'force-static';

export function GET() {
  const { sitemap } = robots();
  const urls = Array.isArray(sitemap) ? sitemap : sitemap ? [sitemap] : [];
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <sitemap><loc>${url}</loc></sitemap>`),
    '</sitemapindex>',
    '',
  ].join('\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
