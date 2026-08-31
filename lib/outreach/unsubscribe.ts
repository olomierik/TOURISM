import { createHmac, timingSafeEqual } from 'node:crypto';

// Relative with the extension, not '@/lib/...'. send-outreach.mjs imports this
// module, and that script is plain node with no knowledge of the tsconfig
// alias — the alias form makes the sender crash on import rather than send.
import { getSupabaseSecretKey } from '../supabase/env.ts';

/**
 * Signed unsubscribe tokens.
 *
 * The outreach message has always offered removal by replying with "remove",
 * which is honest and which Gmail cannot see. Gmail's bulk-sender rules want a
 * List-Unsubscribe header with a URL it can POST to without a human, and the
 * absence of one is a spam signal on every message regardless of content.
 *
 * The token is an HMAC of the address rather than a row id, for two reasons.
 * Nobody can enumerate it — a sequential id in an unsubscribe link is an
 * invitation to unsubscribe every address by counting — and it keeps working
 * if the outreach row is deleted, because the promise made to the recipient
 * ("we will not write to you again") outlives our bookkeeping.
 *
 * Same secret as the analytics visitor hash: this is not protecting anything
 * confidential, it is stopping a stranger from suppressing an address they do
 * not control.
 */

export function unsubscribeToken(email: string): string {
  return createHmac('sha256', getSupabaseSecretKey())
    .update(`unsubscribe:${email.trim().toLowerCase()}`)
    .digest('hex')
    .slice(0, 32);
}

export function unsubscribeTokenValid(email: string, token: string): boolean {
  const expected = unsubscribeToken(email);
  // Constant-time, because a plain === leaks how much of the token was right
  // to anyone willing to time the responses.
  const a = Buffer.from(expected);
  const b = Buffer.from(token ?? '');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The URL that goes in the List-Unsubscribe header and the message body.
 *
 * The address is in the query string, which would normally be exactly the wrong
 * place for personal data. It is unavoidable here — the whole mechanism is a
 * link a mail client can follow with no session — and it is the recipient's own
 * address being sent back to the only party that already had it.
 */
export function unsubscribeUrl(email: string, siteUrl: string): string {
  const params = new URLSearchParams({
    e: email.trim().toLowerCase(),
    t: unsubscribeToken(email),
  });
  return `${siteUrl.replace(/\/$/, '')}/api/outreach/unsubscribe?${params.toString()}`;
}
