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

/** One day of the plan (lead_quotes.itinerary, migration 097). */
export type ItineraryDay = {
  day: number;
  from: string | null;
  to: string | null;
  plan: string | null;
  overnight: string | null;
  meals: string | null;
};

/** Longest plan an operator may send; three months covers any trip sold here. */
export const MAX_ITINERARY_DAYS = 60;

/** Reads a stored or submitted itinerary, dropping anything malformed. */
export function toItinerary(raw: unknown): ItineraryDay[] {
  if (!Array.isArray(raw)) return [];
  const clip = (v: unknown, n: number) => {
    const s = typeof v === 'string' ? v.trim().slice(0, n) : '';
    return s || null;
  };
  return raw
    .slice(0, MAX_ITINERARY_DAYS)
    .map((d, i) => {
      const r = (d ?? {}) as Record<string, unknown>;
      return {
        day: i + 1,
        from: clip(r.from, 120),
        to: clip(r.to, 120),
        plan: clip(r.plan, 1500),
        overnight: clip(r.overnight, 200),
        meals: clip(r.meals, 60),
      };
    })
    .filter((d) => d.from || d.to || d.plan || d.overnight || d.meals)
    .map((d, i) => ({ ...d, day: i + 1 }));
}

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
  /** Arrival and departure, and the day-by-day plan (migration 097). */
  arrivalDate: string | null;
  arrivalPoint: string | null;
  arrivalDetails: string | null;
  departureDate: string | null;
  departurePoint: string | null;
  itinerary: ItineraryDay[];
};

export const QUOTE_CURRENCIES = ['USD', 'EUR', 'GBP', 'TZS', 'KES'] as const;

export const QUOTE_SELECT =
  'total_amount, currency, price_basis, duration_days, valid_until, includes, excludes, notes, updated_at, arrival_date, arrival_point, arrival_details, departure_date, departure_point, itinerary';

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
  arrival_date?: string | null;
  arrival_point?: string | null;
  arrival_details?: string | null;
  departure_date?: string | null;
  departure_point?: string | null;
  itinerary?: unknown;
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
    arrivalDate: r.arrival_date ?? null,
    arrivalPoint: r.arrival_point ?? null,
    arrivalDetails: r.arrival_details ?? null,
    departureDate: r.departure_date ?? null,
    departurePoint: r.departure_point ?? null,
    itinerary: toItinerary(r.itinerary),
  };
}

export function formatMoney(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString(locale)}`;
  }
}
