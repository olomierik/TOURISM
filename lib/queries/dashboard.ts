import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/routing';
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
       address, city, country_code, latitude, longitude, founded_year, team_size, license_number,
       associations, day_rate_low, day_rate_high, day_rate_currency,
       rating_avg, rating_count, response_rate, avg_response_minutes,
       submitted_at, published_at, created_at,
       business_translations (locale, tagline, short_description, description),
       business_categories (category_id),
       business_destinations (destination_id, is_primary)`,
    )
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`getMyBusiness: ${error.message}`);
  if (!data) return null;

  const t = data.business_translations.find((x) => x.locale === locale);

  return {
    ...data,
    tagline: t?.tagline ?? null,
    shortDescription: t?.short_description ?? null,
    description: t?.description ?? null,
    categoryIds: data.business_categories.map((c) => c.category_id),
    destinationIds: data.business_destinations.map((d) => d.destination_id),
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
         leads!inner (
           reference, quality_score, full_name, email, phone, whatsapp,
           travel_start, travel_end, dates_flexible, adults, children,
           budget_min, budget_max, budget_currency, interests, message, locale,
           destinations (destination_translations (locale, name))
         )`,
      )
      .order('sent_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new Error(`getMyLeads: ${error.message}`);

    return (data ?? []).map((row): LeadInboxItem => {
      const l = row.leads;
      return {
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
          l.destinations?.destination_translations.find((x) => x.locale === locale)?.name ??
          null,
      };
    });
  },
);

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
    const t = p.package_translations.find((x) => x.locale === locale);
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
