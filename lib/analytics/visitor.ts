import 'server-only';

import { createHmac } from 'node:crypto';

import { getSupabaseSecretKey } from '@/lib/supabase/env';

/**
 * Who a request came from, as far as analytics is allowed to know.
 *
 * Shared by the view beacon, the event beacon and the WhatsApp redirect, so
 * all three count the same visitor the same way. Two endpoints with different
 * rules for the same visitor would produce two incompatible sets of numbers.
 */

/** Crawlers, previewers and scripts. Answered, never counted. */
export const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python|axios/i;

/**
 * A daily hash of address and browser.
 *
 * Rotates every midnight, so a returning visitor is a new hash tomorrow. That
 * makes "unique visitors today" countable and "track this person across a month"
 * impossible — the same trade Plausible and Fathom make.
 *
 * Without the secret an attacker holding the table could hash all four billion
 * IPv4 addresses and reverse it in an afternoon. With it, the hash is inert.
 */
export function visitorHash(ip: string, userAgent: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHmac('sha256', getSupabaseSecretKey())
    .update(`${day}:${ip}:${userAgent}`)
    .digest('hex')
    .slice(0, 32);
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '0.0.0.0'
  );
}

/**
 * When `contact_clicks` began meaning "a chat by someone who was on the site".
 *
 * Before migration 073 the WhatsApp redirect counted any request that was not
 * caught by the agent blocklist. Measured over the 30 days to this date: 839
 * chats against 246 page views, 787 of them from identities that loaded no
 * pages at all. Those rows are kept — they are a true record of requests that
 * arrived — but they are not contacts, and the owner dashboard must not show
 * them to an operator as though they were.
 *
 * Every read of `contact_clicks` meant for a person starts here.
 */
export const CONTACT_CLICKS_TRUSTED_FROM = new Date('2026-11-08T00:00:00Z');

/**
 * Whether a chat came from a page on this site.
 *
 * A browser navigating from our own page sends a same-origin Referer; a script
 * calling /api/whatsapp/<id> directly sends none, and one following a link it
 * scraped sends someone else's. Absent is allowed — a referrer policy, a
 * privacy extension or an https→http step can strip it from a real traveller —
 * so this only rejects a Referer that is present and belongs to somebody else.
 */
export function sameOriginReferrer(referer: string | null, siteOrigin: string): boolean {
  if (!referer) return true;
  try {
    return new URL(referer).origin === new URL(siteOrigin).origin;
  } catch {
    return false;
  }
}
