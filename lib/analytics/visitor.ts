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
