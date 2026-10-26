/**
 * How many operators a traveller may name themselves on a quote request.
 *
 * Six, to match what the form promises ("up to 6 matched operators") and what
 * the matcher sends on its own. The Saved list is the only surface that can
 * exceed it: somebody who has hearted thirty operators and presses "ask all of
 * them" is asking us to send thirty cold enquiries in their name, which is the
 * traveller-side version of the spam we refuse to send on the operator side.
 *
 * It lives here rather than in `actions.ts` because that module is
 * `'use server'`, where every export has to be an async function.
 */
export const MAX_CHOSEN = 6;

/** A structured quote (lead_quotes, migration 066), as the pages use it. */
export type LeadQuote = {
  totalAmount: number;
  currency: string;
  priceBasis: 'total' | 'per_person';
  durationDays: number | null;
  validUntil: string | null;
  includes: string | null;
  excludes: string | null;
  notes: string | null;
  updatedAt: string;
};

export const QUOTE_CURRENCIES = ['USD', 'EUR', 'GBP', 'TZS', 'KES'] as const;

export const QUOTE_SELECT =
  'total_amount, currency, price_basis, duration_days, valid_until, includes, excludes, notes, updated_at';

type RawQuote = {
  total_amount: number | string;
  currency: string;
  price_basis: string;
  duration_days: number | null;
  valid_until: string | null;
  includes: string | null;
  excludes: string | null;
  notes: string | null;
  updated_at: string;
};

/** A one-to-one embed arrives as an object or a one-element array. */
export function toQuote(raw: unknown): LeadQuote | null {
  const r = (Array.isArray(raw) ? raw[0] : raw) as RawQuote | null | undefined;
  if (!r) return null;
  return {
    totalAmount: Number(r.total_amount),
    currency: r.currency.trim(),
    priceBasis: r.price_basis === 'per_person' ? 'per_person' : 'total',
    durationDays: r.duration_days,
    validUntil: r.valid_until,
    includes: r.includes,
    excludes: r.excludes,
    notes: r.notes,
    updatedAt: r.updated_at,
  };
}

export function formatMoney(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString(locale)}`;
  }
}
