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
 * Crawlers that read a page in order to answer a question and cite the source.
 *
 * These are the ones worth courting: they send referral traffic back. Listed
 * explicitly rather than relying on the wildcard so the intent is legible, and
 * so a future tightening of the `*` rule cannot silently lock them out.
 */
const ANSWER_ENGINE_BOTS = [
  'OAI-SearchBot', // ChatGPT search results
  'ChatGPT-User', // a user asking ChatGPT to open a link
  'PerplexityBot',
  'Perplexity-User',
  'Claude-SearchBot',
  'Claude-User',
  'Applebot', // Siri and Spotlight suggestions
];

/**
 * Crawlers that collect text to train models. They return no traffic.
 *
 * Allowed by default: appearing in a model's world knowledge is worth more to a
 * young travel directory than the content is worth withholding, and the guides
 * are written to be quoted. Move any of these to `disallow` to opt out — the
 * decision is commercial, not technical, which is why they are named separately
 * rather than folded into the block above.
 */
const TRAINING_BOTS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot', 'meta-externalagent'];

const PRIVATE_PATHS = ['/api/', '/admin/', '/dashboard/', '/account/', '/login', '/register'];

export default function robots(): MetadataRoute.Robots {
  if (!allowIndexing) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: ANSWER_ENGINE_BOTS,
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: TRAINING_BOTS,
        allow: '/',
        disallow: PRIVATE_PATHS,
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
