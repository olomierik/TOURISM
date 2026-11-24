import 'server-only';

import { getTranslations } from 'next-intl/server';

import type { Database } from '@/lib/supabase/database.types';
import { toItinerary } from '@/lib/leads/quote-types';
import { localeOf } from '@/lib/leads/thread-access';
import type { BookingDoc, BookingDocLabels, BookingParty, BookingQuote, BookingTrip } from '@/lib/bookings/types';

type BookingRow = Database['public']['Tables']['bookings']['Row'];

/** A bookings row as the document reads it. Tolerant of fields added later. */
export function toBookingDoc(row: BookingRow): BookingDoc {
  const q = (row.quote ?? {}) as Partial<BookingQuote> & { itinerary?: unknown };
  return {
    reference: row.reference,
    status: row.status === 'cancelled' ? 'cancelled' : 'booked',
    bookedAt: row.booked_at,
    locale: row.locale,
    quote: {
      totalAmount: Number(q.totalAmount ?? 0),
      currency: String(q.currency ?? 'USD'),
      priceBasis: q.priceBasis === 'per_person' ? 'per_person' : 'total',
      durationDays: q.durationDays ?? null,
      validUntil: q.validUntil ?? null,
      includes: q.includes ?? null,
      excludes: q.excludes ?? null,
      notes: q.notes ?? null,
      arrivalDate: q.arrivalDate ?? null,
      arrivalPoint: q.arrivalPoint ?? null,
      arrivalDetails: q.arrivalDetails ?? null,
      departureDate: q.departureDate ?? null,
      departurePoint: q.departurePoint ?? null,
      itinerary: toItinerary(q.itinerary),
    },
    trip: row.trip as BookingTrip,
    traveller: row.traveller as BookingParty,
    operator: row.operator as BookingParty,
  };
}

/** Every label the PDF prints, in the booking's language. */
export async function bookingDocLabels(locale: string): Promise<BookingDocLabels> {
  const t = await getTranslations({ locale: localeOf(locale), namespace: 'bookingDoc' });
  const keys: Array<keyof BookingDocLabels> = [
    'title', 'subtitle', 'reference', 'booked', 'enquiry', 'cancelled', 'traveller', 'operator', 'email',
    'phone', 'whatsapp', 'website', 'address', 'licence', 'tripTitle', 'destination', 'dates', 'travellers',
    'duration', 'arrivalTitle', 'arrival', 'departure', 'planTitle', 'day', 'overnight', 'meals', 'priceTitle',
    'total', 'perPerson', 'includes', 'excludes', 'notes', 'validUntil', 'footer', 'page', 'notGiven', 'adults',
    'children', 'days',
  ];
  // `page` carries {n} and {total}, filled per page by the renderer.
  return Object.fromEntries(
    keys.map((k) => [k, k === 'page' ? t.raw(k) : t(k)]),
  ) as BookingDocLabels;
}

export function bookingFilename(reference: string): string {
  return `Explore-Tanzania-${reference}.pdf`;
}
