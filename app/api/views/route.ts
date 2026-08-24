import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';
import { supabaseUrl, supabasePublishableKey, getSupabaseSecretKey } from '@/lib/supabase/env';
import { locales } from '@/i18n/routing';

/**
 * Records a page view.
 *
 * `page_views` has existed since migration 010, is read by the owner analytics
 * screen and the dashboard, and has an RLS insert policy — but nothing in the
 * application ever wrote a row. Every tile read zero, and there was no error
 * anywhere to explain why. This is the missing half.
 *
 * ---
 *
 * Why a browser beacon rather than recording during render:
 *
 * The pages worth measuring — destinations, businesses, packages, guides — are
 * statically generated, which is the whole basis of the SEO architecture. Server
 * components on those routes run once at build time, not once per visitor, so
 * there is no request to record. Reaching for headers() or cookies() to get one
 * would opt every page into dynamic rendering and undo that architecture for the
 * sake of a counter.
 *
 * A beacon fired after load costs the visitor nothing, leaves the pages static,
 * and has a useful side effect: crawlers do not execute it, so these numbers are
 * people rather than bots. That is the right denominator for a conversion rate.
 *
 * The cost is that ad blockers and no-script visitors are missed. Anyone
 * treating this as a total is wrong; it is a floor, and it is consistent with
 * itself over time, which is what makes trends readable.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Anything self-identifying as automated. Cheap, and it only has to catch the honest ones. */
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python|axios/i;

type Body = {
  path?: unknown;
  locale?: unknown;
  referrer?: unknown;
  businessId?: unknown;
  packageId?: unknown;
  guideId?: unknown;
  destinationId?: unknown;
};

const uuidOrNull = (v: unknown) => (typeof v === 'string' && UUID.test(v) ? v : null);

/**
 * A visitor identifier that cannot be turned back into a person.
 *
 * IP and user agent are hashed with a server-only secret and the calendar date,
 * never stored raw. The date in the input is deliberate: the salt effectively
 * rotates every midnight, so a returning visitor is a new hash tomorrow. That
 * makes "unique visitors today" countable and "track this person across a month"
 * impossible — the same trade Plausible and Fathom make.
 *
 * Without the secret an attacker holding the table could hash all four billion
 * IPv4 addresses and reverse it in an afternoon. With it, the hash is inert.
 */
function visitorHash(ip: string, userAgent: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHmac('sha256', getSupabaseSecretKey())
    .update(`${day}:${ip}:${userAgent}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Keeps a referrer only when it names somewhere else.
 *
 * document.referrer is our own URL on every internal navigation, and a top
 * referrers list reading "exploretanzania.online" five times tells an operator
 * nothing about where their traffic comes from.
 */
function externalReferrer(value: unknown, host: string | null): string | null {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (host && url.hostname.replace(/^www\./, '') === host.replace(/^www\./, '')) return null;
    return url.origin + url.pathname;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const userAgent = request.headers.get('user-agent') ?? '';
  // 204 rather than an error: a bot getting a rejection learns something, and
  // the caller has nothing useful to do with a failure either way.
  if (!userAgent || BOT.test(userAgent)) return new Response(null, { status: 204 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return new Response(null, { status: 400 });
  }

  const path = typeof body.path === 'string' ? body.path.slice(0, 512) : null;
  if (!path || !path.startsWith('/')) return new Response(null, { status: 400 });

  const locale =
    typeof body.locale === 'string' && (locales as readonly string[]).includes(body.locale)
      ? body.locale
      : null;

  // Vercel resolves the country at the edge; absent locally and on other hosts,
  // in which case the column stays null rather than guessing.
  const country = request.headers.get('x-vercel-ip-country');
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    // No `next: { revalidate }` here. The public read client sets one, and a
    // cached POST would collapse every view into one recorded row.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });

  const { error } = await supabase.from('page_views').insert({
    path,
    locale,
    business_id: uuidOrNull(body.businessId),
    package_id: uuidOrNull(body.packageId),
    guide_id: uuidOrNull(body.guideId),
    destination_id: uuidOrNull(body.destinationId),
    visitor_hash: visitorHash(ip, userAgent),
    referrer: externalReferrer(body.referrer, request.headers.get('host')),
    country: country && country.length === 2 ? country.toUpperCase() : null,
  });

  // Analytics must never be able to break a page. The beacon ignores the
  // response anyway; this is logged so a broken insert is findable rather than
  // silently reproducing the exact bug this route was written to fix.
  if (error) console.error('page_views insert failed:', error.message);

  return new Response(null, { status: 204 });
}
