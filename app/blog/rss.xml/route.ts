import { getPublishedPosts } from '@/lib/blog/posts';
import { absoluteUrl } from '@/lib/seo';

/**
 * RSS for the blog (SEO brief T10). Published posts only; a draft is never in
 * a feed, wherever the feed is served from.
 *
 * Outside app/[locale] because the proxy never sees paths with a dot in them,
 * so /blog/rss.xml is not rewritten to a locale.
 */
export const dynamic = 'force-static';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function GET() {
  const posts = getPublishedPosts();
  const items = posts
    .map((p) => {
      const url = absoluteUrl(`/blog/${p.slug}`);
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(p.description)}</description>
      <category>${esc(p.category.name)}</category>
      <dc:creator>${esc(p.author.name)}</dc:creator>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>ExploreTanzania.online blog</title>
    <link>${absoluteUrl('/blog')}</link>
    <atom:link href="${absoluteUrl('/blog/rss.xml')}" rel="self" type="application/rss+xml" />
    <description>Safari costs, parks, food and getting around in Tanzania.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
