'use server';

import { revalidatePath } from 'next/cache';
import { getLocale, getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { slugify } from '@/lib/format';
import { toItinerary, formatMoney } from '@/lib/leads/quote-types';
import { submitQuoteRequest } from '@/lib/leads/actions';
import { GROUP_AUDIENCES, isOneOf } from '@/lib/tour-guides/constants';
import { myTourGuide } from '@/lib/tour-guides/queries';

export type DepartureState = { success?: boolean; slug?: string; error?: 'notAllowed' | 'title' | 'dates' | 'price' | 'seats' | 'generic' };

const text = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? '').trim().slice(0, max) || null;
const isDate = (v: string | null): v is string => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));

/**
 * A guide publishes (or edits) an open group trip. Only the guide's own
 * listing; the database checks ownership again. A trip is public once the
 * guide's listing is approved, which for guides means verified.
 */
export async function saveDeparture(_prev: DepartureState, fd: FormData): Promise<DepartureState> {
  const guide = await myTourGuide();
  if (!guide) return { error: 'notAllowed' };

  const title = text(fd, 'title', 140);
  if (!title || title.length < 3) return { error: 'title' };
  const start = text(fd, 'startDate', 10);
  const end = text(fd, 'endDate', 10);
  const today = new Date().toISOString().slice(0, 10);
  if (!isDate(start) || !isDate(end) || end < start || start < today) return { error: 'dates' };
  const price = Number(String(fd.get('price') ?? '').replace(/[ ,]/g, ''));
  if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) return { error: 'price' };
  const seatsTotal = Number(fd.get('seats'));
  if (!Number.isInteger(seatsTotal) || seatsTotal < 2 || seatsTotal > 200) return { error: 'seats' };
  const minGroup = Number(fd.get('minGroup'));
  let itinerary: unknown = [];
  try {
    itinerary = JSON.parse(String(fd.get('itinerary') ?? '[]'));
  } catch {
    itinerary = [];
  }
  const status = String(fd.get('status') ?? 'open');

  const row = {
    business_id: guide.businessId,
    title,
    summary: text(fd, 'summary', 600),
    region: text(fd, 'region', 120),
    start_date: start,
    end_date: end,
    price_per_person: Math.round(price * 100) / 100,
    currency: String(fd.get('currency') ?? 'USD') === 'TZS' ? 'TZS' : 'USD',
    seats_total: seatsTotal,
    min_group: Number.isInteger(minGroup) && minGroup >= 1 && minGroup <= seatsTotal ? minGroup : null,
    audiences: [...new Set(fd.getAll('audiences').map(String))].filter((a) => isOneOf(GROUP_AUDIENCES, a)),
    stay: text(fd, 'stay', 40),
    includes: text(fd, 'includes'),
    excludes: text(fd, 'excludes'),
    arrival_point: text(fd, 'arrivalPoint', 200),
    departure_point: text(fd, 'departurePoint', 200),
    itinerary: toItinerary(itinerary),
    status: ['draft', 'open', 'closed', 'cancelled'].includes(status) ? status : 'open',
    updated_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  const id = text(fd, 'id', 40);
  if (id) {
    const { data, error } = await supabase.from('group_departures').update(row).eq('id', id).select('slug').single();
    if (error || !data) return { error: 'generic' };
    revalidatePath('/group-trips');
    return { success: true, slug: data.slug };
  }

  const admin = createAdminClient();
  const base = slugify(`${title} ${start}`) || 'group-trip';
  let slug = base;
  for (let n = 2; n < 50; n++) {
    const { data: taken } = await admin.from('group_departures').select('id').eq('slug', slug).maybeSingle();
    if (!taken) break;
    slug = `${base}-${n}`;
  }
  const { error } = await supabase.from('group_departures').insert({ ...row, slug });
  if (error) {
    console.error('[departures] insert failed', error.message);
    return { error: 'generic' };
  }
  revalidatePath('/group-trips');
  revalidatePath('/dashboard/departures');
  return { success: true, slug };
}

export type JoinState = {
  url?: string;
  error?: 'full' | 'closed' | 'seats' | 'nameRequired' | 'emailRequired' | 'emailInvalid' | 'messageRequired' | 'rateLimited' | 'generic';
};

/**
 * A traveller joins an open group trip with some seats.
 *
 * It is an enquiry sent to that guide only, with the trip's own price and
 * plan written in as the guide's quote, so the next screen is the
 * conversation with BOOKED ready to press. Seats are only held by a booking;
 * joining without booking holds nothing, which is said on the page.
 */
export async function joinDeparture(departureId: string, _prev: JoinState, fd: FormData): Promise<JoinState> {
  const admin = createAdminClient();
  const { data: dep } = await admin
    .from('group_departures')
    .select('id, title, start_date, end_date, price_per_person, currency, seats_total, status, includes, excludes, arrival_point, departure_point, itinerary, business_id, businesses!inner (slug, status)')
    .eq('id', departureId)
    .maybeSingle();
  const biz = dep ? ((Array.isArray(dep.businesses) ? dep.businesses[0] : dep.businesses) as { slug: string; status: string }) : null;
  const today = new Date().toISOString().slice(0, 10);
  if (!dep || !biz || dep.status !== 'open' || biz.status !== 'approved' || dep.start_date < today) return { error: 'closed' };

  const adults = Number(fd.get('adults') ?? 1);
  const children = Number(fd.get('children') ?? 0);
  const party = (Number.isInteger(adults) ? adults : 0) + (Number.isInteger(children) ? children : 0);
  if (party < 1 || adults < 1) return { error: 'seats' };
  const { data: taken } = await admin.rpc('departure_seats_taken', { p_departure: dep.id });
  if (party > dep.seats_total - Number(taken ?? 0)) return { error: 'full' };

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'groupTrips.join' });
  const forward = new FormData();
  for (const [k, v] of fd.entries()) forward.append(k, v);
  forward.set('message', `${t('messageHead', { title: dep.title, start: dep.start_date, end: dep.end_date, seats: party })}\n\n${String(fd.get('message') ?? '').trim()}`.trim());
  forward.set('chosen', biz.slug);
  forward.delete('alsoSimilar');
  forward.set('travelStart', dep.start_date);
  forward.set('travelEnd', dep.end_date);
  forward.set('sourceUrl', `group-departure:${dep.id}`);

  const res = await submitQuoteRequest({}, forward);
  if (!res.reference) return { error: (res.error as JoinState['error']) ?? 'generic' };

  const { data: lead } = await admin.from('leads').select('id, access_token').eq('reference', res.reference).single();
  if (!lead) return { error: 'generic' };
  const kind = String(fd.get('groupKind') ?? '');
  await admin
    .from('leads')
    .update({ group_departure_id: dep.id, ...(isOneOf(GROUP_AUDIENCES, kind) || kind === 'other' ? { group_kind: kind } : {}) })
    .eq('id', lead.id);

  // The trip's price and plan, as this guide's quote on the enquiry.
  const { data: lb } = await admin
    .from('lead_businesses')
    .select('id')
    .eq('lead_id', lead.id)
    .eq('business_id', dep.business_id)
    .maybeSingle();
  if (lb) {
    const days = Math.round((Date.parse(`${dep.end_date}T12:00:00Z`) - Date.parse(`${dep.start_date}T12:00:00Z`)) / 86_400_000) + 1;
    await admin.from('lead_quotes').upsert(
      {
        lead_business_id: lb.id,
        total_amount: Number(dep.price_per_person),
        currency: dep.currency,
        price_basis: 'per_person',
        duration_days: days,
        valid_until: dep.start_date,
        includes: dep.includes,
        excludes: dep.excludes,
        notes: t('quoteNote', { title: dep.title }),
        arrival_date: dep.start_date,
        arrival_point: dep.arrival_point,
        departure_date: dep.end_date,
        departure_point: dep.departure_point,
        itinerary: toItinerary(dep.itinerary),
      },
      { onConflict: 'lead_business_id' },
    );
    await admin
      .from('lead_businesses')
      .update({ status: 'quoted', quoted_amount: Number(dep.price_per_person), quoted_currency: dep.currency })
      .eq('id', lb.id);
    await admin.from('lead_messages').insert({
      lead_business_id: lb.id,
      sender: 'operator',
      body: t('autoMessage', { title: dep.title, price: formatMoney(Number(dep.price_per_person), dep.currency, locale) }),
    });
  }

  const path = getPathname({ href: { pathname: '/enquiry/[reference]', params: { reference: res.reference } }, locale });
  return { url: `${path}?t=${lead.access_token}#quotes` };
}
