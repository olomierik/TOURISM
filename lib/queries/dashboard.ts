import { cache } from 'react';
import type { ThreadMessage } from '@/lib/leads/messages';
import { toQuote, type LeadQuote } from '@/lib/leads/quote-types';

import { createClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/routing';
import { contentLocale } from '@/i18n/routing';
import type { Enums } from '@/lib/supabase/database.types';

/**
 * Owner-scoped reads for the business dashboard.
 *
 * These deliberately use the cookie-bound server client rather than the admin
 * client: RLS is what enforces "you only see your own business", so no ownership
 * check is duplicated in application code. A duplicated check is one that can
 * drift out of step with the policy and quietly grant more than intended.
 */

/** The signed-in owner's business, or null if they have not created one yet. */
export const getMyBusiness = cache(async (locale: Locale) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('businesses')
    .select(
      `id, slug, name, legal_name, status, tier, is_verified, verified_at,
       logo_url, cover_image_url, email, phone, whatsapp, website,
       address, city, country_code, latitude, longitude, location_precision,
       founded_year, team_size, license_number,
       associations, day_rate_low, day_rate_high, day_rate_currency,
       lead_bid_percent, rate_markup_opt_out,
       rating_avg, rating_count, response_rate, avg_response_minutes,
       submitted_at, published_at, created_at,
       business_translations (locale, tagline, short_description, description),
       business_categories (category_id),
       business_destinations (destination_id, is_primary),
       business_intents (intent, source),
       business_activities (activity, source)`,
    )
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`getMyBusiness: ${error.message}`);
  if (!data) return null;

  const t = data.business_translations.find((x) => x.locale === contentLocale(locale));

  return {
    ...data,
    tagline: t?.tagline ?? null,
    shortDescription: t?.short_description ?? null,
    description: t?.description ?? null,
    categoryIds: data.business_categories.map((c) => c.category_id),
    destinationIds: data.business_destinations.map((d) => d.destination_id),
    // The two descriptive levels from migration 074: the trip an operator is
    // for, and the specific things they run on it. Every one of the 842 rows
    // in business_activities was written by the register importer and not one
    // by an operator, because until now there was nowhere to set them.
    //
    // `source` comes back with them so saving the form can leave a value an
    // operator never touched attributed to the register that supplied it.
    intents: data.business_intents.map((i) => ({ value: i.intent, source: i.source })),
    activities: data.business_activities.map((a) => ({ value: a.activity, source: a.source })),
  };
});

export type LeadInboxItem = {
  id: string;
  leadId: string;
  reference: string;
  status: Enums<'lead_business_status'>;
  rank: number;
  sentAt: string;
  viewedAt: string | null;
  respondedAt: string | null;
  qualityScore: number;
  fullName: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  travelStart: string | null;
  travelEnd: string | null;
  datesFlexible: boolean;
  adults: number;
  children: number;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetCurrency: string;
  interests: string[];
  message: string | null;
  locale: string;
  destinationName: string | null;
  /** The conversation with this traveller, oldest first (lead_messages). */
  messages: ThreadMessage[];
  /** This operator's structured quote, if sent (lead_quotes). */
  quote: LeadQuote | null;
  /**
   * A paid enquiry the operator has not bought yet (migration 089). The trip
   * is filled in from my_lead_teasers(); the traveller's name, email, phone,
   * WhatsApp, the conversation and any quote are empty, because the database
   * returned none of them.
   */
  locked: boolean;
  /** What buying this enquiry costs, fixed when it was matched. 0 when free. */
  fee: number;
  feePercent: number;
  estimatedValue: number;
  feeCurrency: string;
};

/**
 * The lead inbox.
 *
 * Reads through lead_businesses rather than leads, because that is the row the
 * owner actually owns — it carries their status, their rank and their response
 * timestamps, independent of what any other recipient has done with the same
 * enquiry.
 */
export const getMyLeads = cache(
  async (locale: Locale, filters: { status?: Enums<'lead_business_status'> } = {}) => {
    const supabase = await createClient();

    let query = supabase
      .from('lead_businesses')
      .select(
        `id, lead_id, status, rank, sent_at, viewed_at, responded_at,
         lead_offers (unlocked_at, fee_amount, fee_percent, estimated_value, currency),
         leads (
           reference, quality_score, full_name, email, phone, whatsapp,
           travel_start, travel_end, dates_flexible, adults, children,
           budget_min, budget_max, budget_currency, interests, message, locale,
           destinations (destination_translations (locale, name))
         ),
         lead_messages (id, sender, body, created_at, read_at),
         lead_quotes (total_amount, currency, price_basis, duration_days, valid_until, includes, excludes, notes, updated_at)`,
      )
      .order('sent_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new Error(`getMyLeads: ${error.message}`);

    // A row whose lead came back empty is one the operator has not bought:
    // RLS withheld the traveller. Its trip comes from the teaser function,
    // which returns everything but the person, and its destination name from
    // a separate read because the teaser carries only the id.
    const lockedIds = new Set((data ?? []).filter((r) => !r.leads).map((r) => r.id));
    const teasers = new Map<string, Teaser>();
    const destinationNames = new Map<string, string>();
    if (lockedIds.size > 0) {
      const { data: rows, error: tErr } = await supabase.rpc('my_lead_teasers');
      if (tErr) console.error('[leads] teasers failed', tErr.message);
      for (const r of rows ?? []) teasers.set(r.lead_business_id, r);

      const destIds = [...new Set([...teasers.values()].map((r) => r.destination_id).filter(Boolean))] as string[];
      if (destIds.length) {
        const { data: names } = await supabase
          .from('destination_translations')
          .select('destination_id, locale, name')
          .in('destination_id', destIds)
          .in('locale', [contentLocale(locale), 'en']);
        for (const n of names ?? []) {
          if (n.locale === contentLocale(locale) || !destinationNames.has(n.destination_id)) {
            destinationNames.set(n.destination_id, n.name);
          }
        }
      }
    }

    return (data ?? []).flatMap((row): LeadInboxItem[] => {
      const offer = (Array.isArray(row.lead_offers) ? row.lead_offers[0] : row.lead_offers) as
        | {
            unlocked_at: string | null;
            fee_amount: number | string;
            fee_percent: number | string;
            estimated_value: number | string;
            currency: string;
          }
        | null
        | undefined;
      const pricing = {
        fee: Number(offer?.fee_amount ?? 0),
        feePercent: Number(offer?.fee_percent ?? 0),
        estimatedValue: Number(offer?.estimated_value ?? 0),
        feeCurrency: offer?.currency ?? 'USD',
      };

      if (!row.leads) {
        const t = teasers.get(row.id);
        // Locked and no teaser either: nothing to show, rather than a card of
        // blanks the operator cannot act on.
        if (!t) return [];
        return [
          {
            id: row.id,
            leadId: row.lead_id,
            reference: t.reference,
            status: row.status,
            rank: row.rank,
            sentAt: row.sent_at,
            viewedAt: row.viewed_at,
            respondedAt: row.responded_at,
            qualityScore: t.quality_score,
            fullName: '',
            email: '',
            phone: null,
            whatsapp: null,
            travelStart: t.travel_start,
            travelEnd: t.travel_end,
            datesFlexible: t.dates_flexible,
            adults: t.adults,
            children: t.children,
            budgetMin: t.budget_min === null ? null : Number(t.budget_min),
            budgetMax: t.budget_max === null ? null : Number(t.budget_max),
            budgetCurrency: t.budget_currency,
            interests: t.interests ?? [],
            message: t.message,
            locale: t.locale,
            destinationName:
              (t.destination_id ? destinationNames.get(t.destination_id) : null) ?? t.destination_other ?? null,
            messages: [],
            quote: null,
            locked: true,
            ...pricing,
          },
        ];
      }

      const l = row.leads;
      return [{
        locked: false,
        ...pricing,
        id: row.id,
        leadId: row.lead_id,
        reference: l.reference,
        status: row.status,
        rank: row.rank,
        sentAt: row.sent_at,
        viewedAt: row.viewed_at,
        respondedAt: row.responded_at,
        qualityScore: l.quality_score,
        fullName: l.full_name,
        email: l.email,
        phone: l.phone,
        whatsapp: l.whatsapp,
        travelStart: l.travel_start,
        travelEnd: l.travel_end,
        datesFlexible: l.dates_flexible,
        adults: l.adults,
        children: l.children,
        budgetMin: l.budget_min === null ? null : Number(l.budget_min),
        budgetMax: l.budget_max === null ? null : Number(l.budget_max),
        budgetCurrency: l.budget_currency,
        interests: l.interests,
        message: l.message,
        locale: l.locale,
        destinationName:
          l.destinations?.destination_translations.find((x) => x.locale === contentLocale(locale))?.name ??
          null,
        quote: toQuote((row as { lead_quotes?: unknown }).lead_quotes),
        messages: [...(row.lead_messages ?? [])]
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((m) => ({
            id: m.id,
            sender: m.sender as ThreadMessage['sender'],
            body: m.body,
            createdAt: m.created_at,
            readAt: m.read_at,
          })),
      }];
    });
  },
);

type Teaser = {
  lead_business_id: string;
  reference: string;
  destination_id: string | null;
  destination_other: string | null;
  travel_start: string | null;
  travel_end: string | null;
  dates_flexible: boolean;
  adults: number;
  children: number;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: string;
  interests: string[];
  message: string | null;
  locale: string;
  quality_score: number;
};

/**
 * Headline numbers for the dashboard overview.
 *
 * Counts come from the lead rows the owner can already see, so RLS does the
 * scoping and these cannot accidentally report another business's figures.
 */
export const getDashboardStats = cache(async (businessId: string) => {
  const supabase = await createClient();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [total, thisMonth, awaiting, won, views] = await Promise.all([
    supabase.from('lead_businesses').select('id', { count: 'exact', head: true }),
    supabase
      .from('lead_businesses')
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', monthStart.toISOString()),
    supabase
      .from('lead_businesses')
      .select('id', { count: 'exact', head: true })
      .in('status', ['sent', 'viewed']),
    supabase
      .from('lead_businesses')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'won'),
    supabase
      .from('page_views')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', monthStart.toISOString()),
  ]);

  return {
    totalLeads: total.count ?? 0,
    leadsThisMonth: thisMonth.count ?? 0,
    awaitingReply: awaiting.count ?? 0,
    won: won.count ?? 0,
    // page_views is admin-read only, so this comes back null for an owner until
    // a reporting view is added. Showing null is honest; showing 0 is a lie.
    profileViewsThisMonth: views.error ? null : (views.count ?? 0),
  };
});

/** Packages belonging to the owner's business, including unpublished drafts. */
export const getMyPackages = cache(async (businessId: string, locale: Locale) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('packages')
    .select(
      `id, slug, status, duration_days, duration_nights, price_from, currency,
       price_unit, is_featured, updated_at,
       package_translations (locale, title, summary)`,
    )
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`getMyPackages: ${error.message}`);

  return (data ?? []).map((p) => {
    const t = p.package_translations.find((x) => x.locale === contentLocale(locale));
    return {
      id: p.id,
      slug: p.slug,
      status: p.status,
      title: t?.title ?? p.slug,
      summary: t?.summary ?? null,
      durationDays: p.duration_days,
      durationNights: p.duration_nights,
      priceFrom: p.price_from === null ? null : Number(p.price_from),
      currency: p.currency,
      priceUnit: p.price_unit,
      isFeatured: p.is_featured,
      updatedAt: p.updated_at,
    };
  });
});
