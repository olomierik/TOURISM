import { MARK_LAND, MARK_SUN, MARK_VIEW_BOX } from '@/components/layout/logo-paths';

/**
 * The logo's two shapes as cacheable SVG files, for LogoMark's CSS masks
 * (SEO brief T4).
 *
 * The mark used to be inlined as path data wherever it appeared: three copies
 * on the homepage, about 14 KB of identical numbers in every page's HTML.
 * Served once from here and cached, it costs nothing after the first page,
 * and it keeps the theme colours, because a mask only gives the shape: the
 * colour still comes from --brand-gold and --brand-mark.
 *
 * Built from logo-paths.ts, the generated source, so it cannot drift from it.
 * Outside app/[locale]: the proxy skips paths with a dot.
 */
export const dynamic = 'force-static';

const PATHS: Record<string, string> = { 'sun.svg': MARK_SUN, 'land.svg': MARK_LAND };

export function generateStaticParams() {
  return Object.keys(PATHS).map((file) => ({ file }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const d = PATHS[file];
  if (!d) return new Response('Not found', { status: 404 });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEW_BOX}"><path d="${d}" fill="#000" fill-rule="evenodd"/></svg>`;
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=31536000',
    },
  });
}
