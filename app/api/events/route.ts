import { createHmac } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseSecretKey } from '@/lib/supabase/env';
import { isTrackEvent, safeProps, safePath, localeFromPath } from '@/lib/analytics/sanitize';

/**
 * Product funnel events.
 *
 * The sibling of /api/views, and the half that was missing: views count
 * arrivals, these count what somebody did after arriving. 42 page views and
 * zero leads is a funnel with no instrumentation between its two ends, so
 * there is no way to tell whether the problem is that nobody comes or that
 * everybody leaves.
 *
 * Same shape as the view beacon on purpose — same bot filter, same rotating
 * daily visitor hash, same refusal to store anything that identifies a person.
 * Two endpoints with different rules for the same visitor would produce two
 * incompatible sets of numbers.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python|axios/i;

/** Same construction as the view beacon: rotates at midnight, inert without the secret. */
function visitorHash(ip: string, userAgent: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHmac('sha256', getSupabaseSecretKey())
    .update(`${day}:${ip}:${userAgent}`)
    .digest('hex')
    .slice(0, 32);
}

export async function POST(request: Request) {
  const userAgent = request.headers.get('user-agent') ?? '';
  // Answer 204 to bots rather than 4xx: a crawler that gets an error retries.
  if (BOT.test(userAgent)) return new Response(null, { status: 204 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  const { event, props, path } = (body ?? {}) as {
    event?: unknown;
    props?: unknown;
    path?: unknown;
  };

  if (!isTrackEvent(event)) return new Response(null, { status: 204 });

  const cleanPath = safePath(path);

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '0.0.0.0';

  const { error } = await createAdminClient()
    .from('analytics_events')
    .insert({
      event: event as never,
      path: cleanPath,
      locale: localeFromPath(cleanPath),
      visitor_hash: visitorHash(ip, userAgent),
      props: safeProps(props),
    });

  // Never surface a failure to the page. A beacon that reports an error is a
  // console full of red on a page a traveller is trying to read, and there is
  // nothing the browser could usefully do about it.
  if (error) console.error('[events]', error.message);

  return new Response(null, { status: 204 });
}
