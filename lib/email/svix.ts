import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Checks a webhook signed the way Resend signs them (Svix).
 *
 * The signed content is `${svix-id}.${svix-timestamp}.${raw body}`, HMAC-SHA256
 * with the base64 key after the secret's `whsec_` prefix. The signature header
 * holds one or more space-separated `v1,<base64>` entries (more than one while
 * a secret is being rotated); any match is enough. A timestamp more than five
 * minutes from now is refused, so a captured delivery cannot be replayed later.
 */
export const SVIX_TOLERANCE_SECONDS = 5 * 60;

export function signSvix(secret: string, id: string, timestamp: string, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  return createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
}

export function verifySvix(input: {
  secret: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  body: string;
  nowSeconds?: number;
}): boolean {
  const { secret, id, timestamp, signature, body } = input;
  if (!secret || !id || !timestamp || !signature) return false;
  if (!/^\d+$/.test(timestamp)) return false;

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > SVIX_TOLERANCE_SECONDS) return false;

  const expected = Buffer.from(signSvix(secret, id, timestamp, body));
  return signature.split(' ').some((entry) => {
    const [version, value] = entry.split(',');
    if (version !== 'v1' || !value) return false;
    const given = Buffer.from(value);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
