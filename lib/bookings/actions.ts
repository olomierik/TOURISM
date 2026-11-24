'use server';

import { getTranslations } from 'next-intl/server';
import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/database.types';
import { getEmailProvider } from '@/lib/notifications';
import { renderBrandedEmail } from '@/lib/notifications/template';
import { CONTACT_DETAILS } from '@/lib/billing/bank';
import { QUOTE_SELECT, formatMoney, toQuote } from '@/lib/leads/quote-types';
import { loadThread, localeOf, travelerLink } from '@/lib/leads/thread-access';
import { siteUrl } from '@/lib/seo';
import { renderBookingPdf } from '@/lib/bookings/pdf';
import { bookingDocLabels, bookingFilename, toBookingDoc } from '@/lib/bookings/load';
import type { BookingParty, BookingQuote, BookingTrip } from '@/lib/bookings/types';
import { createFeeForBooking } from '@/lib/fees/create';
import { MOBILE_MONEY_LABEL } from '@/lib/tour-guides/constants';

export type BookState = {
  reference?: string;
  error?: 'signIn' | 'notAllowed' | 'noQuote' | 'expired' | 'alreadyBooked' | 'generic';
};

/**
 * The traveller presses BOOKED on the quote they agreed with an operator.
 *
 * Signed in, always: the trip document is emailed to an account and listed
 * under it, and a booking made by whoever holds a forwarded link is not one
 * the traveller made. A guest who opened their enquiry from the emailed link
 * is asked to sign in first, and the enquiry is attached to that account.
 *
 * Everything the document shows is copied into the bookings row now, so the
 * PDF reads the same later whatever happens to the listing or the quote. The
 * document is emailed to the traveller, the operator and admin, and can be
 * downloaded again from the enquiry, the dashboard and the admin pages.
 */
export async function bookTrip(leadBusinessId: string, token?: string): Promise<BookState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'signIn' };

  const thread = await loadThread(leadBusinessId);
  if (!thread) return { error: 'notAllowed' };

  const admin = createAdminClient();

  // Is this the enquiry's traveller? Either it is already theirs, or they
  // opened it from the link we emailed them and it belongs to nobody yet.
  if (thread.lead.traveler_id !== user.id) {
    const holdsKey = Boolean(token) && token === thread.lead.access_token;
    if (!holdsKey || thread.lead.traveler_id) return { error: 'notAllowed' };
    const { error } = await admin.from('leads').update({ traveler_id: user.id }).eq('id', thread.lead.id);
    if (error) return { error: 'generic' };
  }

  const existing = await admin
    .from('bookings')
    .select('reference, lead_business_id, status')
    .eq('lead_id', thread.lead.id)
    .eq('status', 'booked')
    .maybeSingle();
  if (existing.data) {
    return existing.data.lead_business_id === thread.id
      ? { reference: existing.data.reference }
      : { error: 'alreadyBooked' };
  }

  const { data: quoteRow } = await admin
    .from('lead_quotes')
    .select(QUOTE_SELECT)
    .eq('lead_business_id', thread.id)
    .maybeSingle();
  const quote = toQuote(quoteRow);
  if (!quote) return { error: 'noQuote' };
  const today = new Date().toISOString().slice(0, 10);
  if (quote.validUntil && quote.validUntil < today) return { error: 'expired' };

  const locale = localeOf(thread.lead.locale);

  const [{ data: lead }, { data: biz }] = await Promise.all([
    admin
      .from('leads')
      .select(
        `full_name, email, phone, whatsapp, travel_start, travel_end, adults, children, destination_other,
         destinations (destination_translations (locale, name))`,
      )
      .eq('id', thread.lead.id)
      .maybeSingle(),
    admin
      .from('businesses')
      .select('name, legal_name, email, phone, whatsapp, website, address, city, country_code, license_number, owner_id')
      .eq('id', thread.business.id)
      .maybeSingle(),
  ]);
  if (!lead || !biz) return { error: 'generic' };

  const destTranslations =
    ((lead.destinations as { destination_translations?: Array<{ locale: string; name: string }> } | null)
      ?.destination_translations ?? []);
  const destination =
    destTranslations.find((d) => d.locale === locale)?.name ??
    destTranslations.find((d) => d.locale === 'en')?.name ??
    lead.destination_other ??
    null;

  // Where the operator is reached: the listing's own address, else the
  // account that owns it.
  let operatorEmail = biz.email as string | null;
  if (!operatorEmail && biz.owner_id) {
    const { data: owner } = await admin.from('profiles').select('email').eq('id', biz.owner_id).maybeSingle();
    operatorEmail = owner?.email ?? null;
  }

  const frozenQuote: BookingQuote = {
    totalAmount: quote.totalAmount,
    currency: quote.currency,
    priceBasis: quote.priceBasis,
    durationDays: quote.durationDays,
    validUntil: quote.validUntil,
    includes: quote.includes,
    excludes: quote.excludes,
    notes: quote.notes,
    arrivalDate: quote.arrivalDate,
    arrivalPoint: quote.arrivalPoint,
    arrivalDetails: quote.arrivalDetails,
    departureDate: quote.departureDate,
    departurePoint: quote.departurePoint,
    itinerary: quote.itinerary,
  };
  const trip: BookingTrip = {
    enquiryReference: thread.lead.reference,
    destination,
    travelStart: quote.arrivalDate ?? lead.travel_start,
    travelEnd: quote.departureDate ?? lead.travel_end,
    adults: lead.adults,
    children: lead.children,
  };
  const traveller: BookingParty = {
    name: lead.full_name,
    email: lead.email ?? user.email ?? null,
    phone: lead.phone,
    whatsapp: lead.whatsapp,
  };
  const operator: BookingParty = {
    name: biz.name,
    legalName: biz.legal_name,
    email: operatorEmail,
    phone: biz.phone,
    whatsapp: biz.whatsapp,
    website: biz.website,
    address: [biz.address, biz.city].filter(Boolean).join(', ') || null,
    licence: biz.license_number,
    mobileMoney: await (async () => {
      const { data: g } = await admin
        .from('tour_guide_profiles')
        .select('mobile_money_provider, mobile_money_number, mobile_money_name')
        .eq('business_id', thread.business.id)
        .maybeSingle();
      if (!g?.mobile_money_provider || !g.mobile_money_number) return null;
      const label = MOBILE_MONEY_LABEL[g.mobile_money_provider as keyof typeof MOBILE_MONEY_LABEL] ?? 'Mobile money';
      return `${label} ${g.mobile_money_number}${g.mobile_money_name ? ` (${g.mobile_money_name})` : ''}`;
    })(),
  };

  const { data: inserted, error: insertError } = await admin
    .from('bookings')
    .insert({
      lead_business_id: thread.id,
      lead_id: thread.lead.id,
      business_id: thread.business.id,
      traveler_id: user.id,
      quote: frozenQuote as unknown as Json,
      trip: trip as unknown as Json,
      traveller: traveller as unknown as Json,
      operator: operator as unknown as Json,
      locale,
    })
    .select('*')
    .single();
  if (insertError || !inserted) {
    // A second press racing the first lands on the unique index: answer with
    // the booking that won rather than an error.
    const again = await admin.from('bookings').select('reference').eq('lead_business_id', thread.id).maybeSingle();
    if (again.data) return { reference: again.data.reference };
    console.error('[bookings] insert failed', thread.lead.reference, insertError?.message);
    return { error: 'generic' };
  }

  // Local tour guides pay per traveller, after the trip (migration 098).
  await createFeeForBooking(admin, {
    id: inserted.id,
    businessId: thread.business.id,
    travellers: (lead.adults ?? 1) + (lead.children ?? 0),
    tripEnd: trip.travelEnd,
    tripStart: trip.travelStart,
    days: quote.durationDays,
  });

  await Promise.all([
    admin.from('lead_businesses').update({ status: 'won' }).eq('id', thread.id),
    admin.from('leads').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', thread.lead.id),
  ]);

  const t = await getTranslations({ locale, namespace: 'booking' });
  const price = formatMoney(quote.totalAmount, quote.currency, locale);
  await admin.from('lead_messages').insert({
    lead_business_id: thread.id,
    sender: 'traveler',
    sender_profile_id: user.id,
    body: t('threadNote', { reference: inserted.reference, price }),
  });

  // The document, once, to all three. A failure here does not undo the
  // booking: it is recorded and downloadable, and the emails can be resent.
  try {
    const doc = toBookingDoc(inserted);
    const pdf = await renderBookingPdf(doc, await bookingDocLabels(locale));
    const attachments = [{ filename: bookingFilename(inserted.reference), content: pdf }];
    const mailer = getEmailProvider();
    const pdfUrl = `${siteUrl}/api/bookings/${inserted.reference}/pdf`;

    const toTraveller = renderBrandedEmail({
      heading: t('travellerHeading', { business: biz.name }),
      paragraphs: [t('travellerBody', { reference: inserted.reference, price }), t('travellerNext')],
      action: { label: t('travellerCta'), url: `${travelerLink(thread)}#quotes` },
      footnote: t('emailFoot', { reference: inserted.reference }),
    });
    const sends = [
      mailer.send({
        to: thread.lead.email,
        subject: t('travellerSubject', { reference: inserted.reference, business: biz.name }),
        ...toTraveller,
        attachments,
      }),
    ];
    if (operatorEmail) {
      const toOperator = renderBrandedEmail({
        heading: t('operatorHeading', { name: lead.full_name }),
        paragraphs: [t('operatorBody', { reference: inserted.reference, price, name: lead.full_name }), t('operatorNext')],
        action: { label: t('operatorCta'), url: `${siteUrl}/dashboard/leads` },
        footnote: t('emailFoot', { reference: inserted.reference }),
      });
      sends.push(
        mailer.send({
          to: operatorEmail,
          subject: t('operatorSubject', { reference: inserted.reference, name: lead.full_name }),
          ...toOperator,
          replyTo: thread.lead.email,
          attachments,
        }),
      );
    }
    const toAdmin = renderBrandedEmail({
      heading: `Booked: ${inserted.reference}`,
      paragraphs: [
        `${lead.full_name} booked ${biz.name} for ${price} (enquiry ${thread.lead.reference}).`,
        'The trip document is attached and kept under Admin → Bookings.',
      ],
      action: { label: 'Download the PDF', url: pdfUrl },
    });
    sends.push(
      mailer.send({
        to: CONTACT_DETAILS.email,
        subject: `Booking ${inserted.reference}: ${lead.full_name} with ${biz.name}`,
        ...toAdmin,
        attachments,
      }),
    );
    const results = await Promise.all(sends);
    if (results[0]?.ok) {
      await admin.from('bookings').update({ emailed_at: new Date().toISOString() }).eq('id', inserted.id);
    }
  } catch (err) {
    console.error('[bookings] document or email failed', inserted.reference, err);
  }

  revalidatePath('/dashboard/leads');
  revalidatePath('/admin/bookings');
  return { reference: inserted.reference };
}
