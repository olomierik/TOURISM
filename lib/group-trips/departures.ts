import 'server-only';

import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import { createPublicClient } from '@/lib/supabase/public';
import { toItinerary, type ItineraryDay } from '@/lib/leads/quote-types';

export type Departure = {
  id: string;
  businessId: string;
  slug: string;
  title: string;
  summary: string | null;
  region: string | null;
  startDate: string;
  endDate: string;
  days: number;
  pricePerPerson: number;
  currency: string;
  seatsTotal: number;
  seatsTaken: number;
  seatsLeft: number;
  minGroup: number | null;
  audiences: string[];
  stay: string | null;
  includes: string | null;
  excludes: string | null;
  arrivalPoint: string | null;
  departurePoint: string | null;
  itinerary: ItineraryDay[];
  status: 'draft' | 'open' | 'closed' | 'cancelled';
  guide: { name: string; slug: string; city: string | null; verified: boolean };
};

const SELECT = `id, business_id, slug, title, summary, region, start_date, end_date, price_per_person, currency,
  seats_total, min_group, audiences, stay, includes, excludes, arrival_point, departure_point, itinerary, status,
  businesses!inner (name, slug, city, is_verified, status, deleted_at)`;

type Row = {
  id: string;
  business_id: string;
  slug: string;
  title: string;
  summary: string | null;
  region: string | null;
  start_date: string;
  end_date: string;
  price_per_person: number | string;
  currency: string;
  seats_total: number;
  min_group: number | null;
  audiences: string[];
  stay: string | null;
  includes: string | null;
  excludes: string | null;
  arrival_point: string | null;
  departure_point: string | null;
  itinerary: unknown;
  status: string;
  businesses: { name: string; slug: string; city: string | null; is_verified: boolean };
};

const dayCount = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000) + 1;

function toDeparture(r: Row, taken: number): Departure {
  return {
    id: r.id,
    businessId: r.business_id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    region: r.region,
    startDate: r.start_date,
    endDate: r.end_date,
    days: dayCount(r.start_date, r.end_date),
    pricePerPerson: Number(r.price_per_person),
    currency: r.currency,
    seatsTotal: r.seats_total,
    seatsTaken: taken,
    seatsLeft: Math.max(0, r.seats_total - taken),
    minGroup: r.min_group,
    audiences: r.audiences ?? [],
    stay: r.stay,
    includes: r.includes,
    excludes: r.excludes,
    arrivalPoint: r.arrival_point,
    departurePoint: r.departure_point,
    itinerary: toItinerary(r.itinerary),
    status: (['draft', 'open', 'closed', 'cancelled'].includes(r.status) ? r.status : 'open') as Departure['status'],
    guide: { name: r.businesses.name, slug: r.businesses.slug, city: r.businesses.city, verified: r.businesses.is_verified },
  };
}

async function seats(client: ReturnType<typeof createPublicClient>, ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await client.rpc('departure_seats_taken', { p_departure: id });
      out.set(id, Number(data ?? 0));
    }),
  );
  return out;
}

/** Upcoming open trips anyone can join, soonest first. */
export const listOpenDepartures = cache(async (limit = 24): Promise<Departure[]> => {
  const client = createPublicClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await client
    .from('group_departures')
    .select(SELECT)
    .eq('status', 'open')
    .gte('start_date', today)
    .eq('businesses.status', 'approved')
    .is('businesses.deleted_at', null)
    .order('start_date')
    .limit(limit);
  if (error) {
    console.warn('listOpenDepartures', error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as Row[];
  const taken = await seats(client, rows.map((r) => r.id));
  return rows.map((r) => toDeparture(r, taken.get(r.id) ?? 0));
});

/** One trip by its address, open or closed (so a shared link still answers). */
export const getDepartureBySlug = cache(async (slug: string): Promise<Departure | null> => {
  const client = createPublicClient();
  const { data } = await client.from('group_departures').select(SELECT).eq('slug', slug).maybeSingle();
  if (!data) return null;
  const r = data as unknown as Row;
  const taken = await seats(client, [r.id]);
  return toDeparture(r, taken.get(r.id) ?? 0);
});

/** A guide's own trips, every status, for the dashboard. */
export async function myDepartures(businessId: string): Promise<Departure[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('group_departures')
    .select(SELECT)
    .eq('business_id', businessId)
    .order('start_date', { ascending: false });
  const rows = (data ?? []) as unknown as Row[];
  const taken = await seats(createPublicClient(), rows.map((r) => r.id));
  return rows.map((r) => toDeparture(r, taken.get(r.id) ?? 0));
}
