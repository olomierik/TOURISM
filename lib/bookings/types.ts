import type { ItineraryDay } from '@/lib/leads/quote-types';

/**
 * A booked trip as the document shows it: everything frozen into the
 * bookings row at the moment the traveller pressed BOOKED (migration 097).
 */
export type BookingQuote = {
  totalAmount: number;
  currency: string;
  priceBasis: 'total' | 'per_person';
  durationDays: number | null;
  validUntil: string | null;
  includes: string | null;
  excludes: string | null;
  notes: string | null;
  arrivalDate: string | null;
  arrivalPoint: string | null;
  arrivalDetails: string | null;
  departureDate: string | null;
  departurePoint: string | null;
  itinerary: ItineraryDay[];
};

export type BookingTrip = {
  enquiryReference: string;
  destination: string | null;
  travelStart: string | null;
  travelEnd: string | null;
  adults: number | null;
  children: number | null;
};

export type BookingParty = {
  name: string;
  legalName?: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website?: string | null;
  address?: string | null;
  licence?: string | null;
};

export type BookingDoc = {
  reference: string;
  status: 'booked' | 'cancelled';
  bookedAt: string;
  locale: string;
  quote: BookingQuote;
  trip: BookingTrip;
  traveller: BookingParty;
  operator: BookingParty;
};

/** The labels the PDF prints, in the traveller's language (bookingDoc.*). */
export type BookingDocLabels = {
  title: string;
  subtitle: string;
  reference: string;
  booked: string;
  enquiry: string;
  cancelled: string;
  traveller: string;
  operator: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  address: string;
  licence: string;
  tripTitle: string;
  destination: string;
  dates: string;
  travellers: string;
  duration: string;
  arrivalTitle: string;
  arrival: string;
  departure: string;
  planTitle: string;
  day: string;
  overnight: string;
  meals: string;
  priceTitle: string;
  total: string;
  perPerson: string;
  includes: string;
  excludes: string;
  notes: string;
  validUntil: string;
  footer: string;
  page: string;
  notGiven: string;
  adults: string;
  children: string;
  days: string;
};
