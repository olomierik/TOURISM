/**
 * The enquiry form's rules, with no framework in them.
 *
 * Pulled out of the server action so they can be run by `npm test` on every
 * pull request. This is the one form the business depends on, and it has
 * already failed silently once: the honeypot was named `company`, Chrome
 * autofilled it, and every traveller with autofill on was shown a reference
 * number while their enquiry was thrown away. Nothing caught it, because
 * nothing ran the form.
 *
 * No imports, on purpose: the test runs this file under plain node.
 */

export type QuoteErrorKey =
  | 'nameRequired'
  | 'emailRequired'
  | 'emailInvalid'
  | 'messageRequired'
  | 'datesInvalid'
  | 'travelersInvalid'
  | 'rateLimited'
  | 'generic';

/**
 * The hidden field bots fill and people never see. The name must match no
 * browser autofill heuristic — see the note above, and tests/enquiry-form.
 */
export const HONEYPOT_FIELD = 'et_hp_ref';

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const MIN_MESSAGE_LENGTH = 10;
export const MAX_PARTY = 40;

type Fields = { get(name: string): unknown };

export const str = (fd: Fields, key: string) => String(fd.get(key) ?? '').trim();
export const nullable = (fd: Fields, key: string) => str(fd, key) || null;

export function num(fd: Fields, key: string): number | null {
  const raw = str(fd, key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export type ValidatedQuote = {
  fullName: string;
  email: string;
  message: string;
  travelStart: string | null;
  travelEnd: string | null;
  adults: number;
  children: number;
};

export type QuoteCheck =
  | { kind: 'honeypot' }
  | { kind: 'error'; error: QuoteErrorKey }
  | { kind: 'ok'; value: ValidatedQuote };

export function checkQuoteForm(fd: Fields): QuoteCheck {
  if (str(fd, HONEYPOT_FIELD)) return { kind: 'honeypot' };

  const fullName = str(fd, 'fullName');
  const email = str(fd, 'email');
  const message = str(fd, 'message');

  if (!fullName) return { kind: 'error', error: 'nameRequired' };
  if (!email) return { kind: 'error', error: 'emailRequired' };
  if (!EMAIL_RE.test(email)) return { kind: 'error', error: 'emailInvalid' };
  if (message.length < MIN_MESSAGE_LENGTH) return { kind: 'error', error: 'messageRequired' };

  const travelStart = nullable(fd, 'travelStart');
  const travelEnd = nullable(fd, 'travelEnd');
  if (travelStart && travelEnd && travelEnd < travelStart) {
    return { kind: 'error', error: 'datesInvalid' };
  }

  const adults = num(fd, 'adults') ?? 1;
  const children = num(fd, 'children') ?? 0;
  if (adults < 1 || adults > MAX_PARTY || children < 0 || children > MAX_PARTY) {
    return { kind: 'error', error: 'travelersInvalid' };
  }

  return { kind: 'ok', value: { fullName, email, message, travelStart, travelEnd, adults, children } };
}
