import { createAdminClient } from '@/lib/supabase/admin';
import { siteUrl } from '@/lib/seo';
import { SHOW_RATING_MIN_COUNT } from '@/lib/badges';

/**
 * /badge/<slug>.svg — the badge an operator puts on their own site (SEO brief
 * T12), wrapped in a normal followed link to their listing.
 *
 * It says only what is true of that listing: "Verified on
 * ExploreTanzania.online" if an administrator has verified it, "Listed on"
 * otherwise, and the rating once it rests on enough reviews to be one.
 *
 * Each request is counted (badge_impressions) with the referring host
 * (badge_referrers), which is how the admin report knows who has installed
 * it. Nothing personal is stored: a day, a count and a domain. Browsers keep
 * the image for an hour, so one visitor reading several pages counts once.
 *
 * Outside app/[locale] because the proxy skips paths with a dot.
 * ?theme=dark gives the dark variant.
 */
export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function svg({ verified, rating, count, dark }: { verified: boolean; rating: number | null; count: number; dark: boolean }) {
  const bg = dark ? '#16201b' : '#ffffff';
  const border = dark ? '#2f3d35' : '#d7e0da';
  const fg = dark ? '#e8efea' : '#1c2a22';
  const muted = dark ? '#a6b6ad' : '#5b6b62';
  const accent = dark ? '#7cc79d' : '#2f6f4e';
  const label = verified ? 'Verified on' : 'Listed on';
  const ratingLine =
    rating != null ? `<text x="62" y="50" font-size="11" fill="${muted}">★ ${rating.toFixed(1)} · ${count} reviews</text>` : '';
  const mark = verified
    ? `<circle cx="30" cy="30" r="16" fill="${accent}"/><path d="M22 30.5l5.5 5.5L38.5 25" fill="none" stroke="${bg}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<circle cx="30" cy="30" r="16" fill="none" stroke="${accent}" stroke-width="3"/><circle cx="30" cy="30" r="5" fill="${accent}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60" role="img" aria-label="${esc(`${label} ExploreTanzania.online`)}">
<rect x="0.5" y="0.5" width="219" height="59" rx="10" fill="${bg}" stroke="${border}"/>
${mark}
<g font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
<text x="62" y="${rating != null ? 22 : 27}" font-size="11" fill="${muted}">${label}</text>
<text x="62" y="${rating != null ? 37 : 43}" font-size="14" font-weight="700" fill="${fg}">ExploreTanzania.online</text>
${ratingLine}
</g>
</svg>`;
}

export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const slug = file.replace(/\.svg$/, '');
  if (!/^[a-z0-9-]{1,140}$/.test(slug) || !file.endsWith('.svg')) {
    return new Response('Not found', { status: 404 });
  }

  const admin = createAdminClient();
  const { data: b } = await admin
    .from('businesses')
    .select('id, is_verified, rating_avg, rating_count')
    .eq('slug', slug)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .maybeSingle();
  if (!b) return new Response('Not found', { status: 404 });

  // The referring host only, and never our own pages (the dashboard preview).
  let domain: string | null = null;
  try {
    const ref = request.headers.get('referer');
    if (ref) {
      const host = new URL(ref).hostname.toLowerCase().replace(/^www\./, '');
      const own = new URL(siteUrl).hostname.replace(/^www\./, '');
      if (host !== own && host !== 'localhost' && !host.endsWith('.netlify.app')) domain = host;
    }
  } catch {
    domain = null;
  }

  // Counting must never cost the operator their badge: a failed write still
  // serves the image.
  try {
    await admin.rpc('record_badge_hit', { target: b.id, ref_domain: domain });
  } catch (err) {
    console.warn('[badge] could not record hit', err);
  }

  const count = b.rating_count ?? 0;
  const body = svg({
    verified: b.is_verified === true,
    rating: count >= SHOW_RATING_MIN_COUNT ? Number(b.rating_avg) : null,
    count,
    dark: new URL(request.url).searchParams.get('theme') === 'dark',
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'private, max-age=3600',
      // Meant to appear on other sites.
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  });
}
