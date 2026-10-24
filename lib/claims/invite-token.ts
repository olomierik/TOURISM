import { createHash, randomBytes } from 'node:crypto';

/**
 * Single-use claim links (claim_invites, migration 067).
 *
 * Plain node with no server-only import: send-outreach.mjs makes the tokens,
 * and the app checks them. Only the SHA-256 of a token is stored, so the table
 * holds nothing a reader could open a listing with.
 */

/** Days a claim link keeps working after the message carrying it is sent. */
export const CLAIM_INVITE_DAYS = 30;

/** 24 random bytes, base64url: 32 characters, nothing to guess. */
export function newInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

export function isInviteToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{32}$/.test(token);
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * The staged message body with this token added to its claim link.
 *
 * Null when the body carries no claim link for the listing (an admin edited it
 * out, or it points somewhere else): the caller then sends the message as it
 * stands rather than inventing where the link should go.
 */
export function withInvite(body: string, slug: string, token: string): string | null {
  const safeSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const link = new RegExp(`(https?://[^\\s]*/business/${safeSlug}/claim)(?=\\s|$)`);
  if (!link.test(body)) return null;
  return body.replace(link, `$1?invite=${token}`);
}
