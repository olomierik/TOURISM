import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/routing';
import type { Enums } from '@/lib/supabase/database.types';

/**
 * Admin reads.
 *
 * These use the cookie-bound client, not the service client. The admin RLS
 * policies already grant full access, so going through them means an accidental
 * call from a non-admin context returns nothing rather than quietly exposing
 * everything — the failure mode is empty, not catastrophic.
 */

export const getAdminOverview = cache(async () => {
  const supabase = await createClient();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [pendingBusinesses, liveBusinesses, pendingReviews, leadsThisMonth, unverified] =
    await Promise.all([
      supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .is('deleted_at', null),
      supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved')
        .is('deleted_at', null),
      supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .is('deleted_at', null),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString()),
      supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved')
        .eq('is_verified', false)
        .is('deleted_at', null),
    ]);

  return {
    pendingBusinesses: pendingBusinesses.count ?? 0,
    liveBusinesses: liveBusinesses.count ?? 0,
    pendingReviews: pendingReviews.count ?? 0,
    leadsThisMonth: leadsThisMonth.count ?? 0,
    unverifiedBusinesses: unverified.count ?? 0,
  };
});

export const getAdminBusinesses = cache(
  async (locale: Locale, status?: Enums<'business_status'>) => {
    const supabase = await createClient();

    let query = supabase
      .from('businesses')
      .select(
        `id, slug, name, status, tier, is_verified, city, email, phone,
         rating_avg, rating_count, is_demo, submitted_at, created_at, owner_id,
         business_translations (locale, tagline),
         profiles!businesses_owner_id_fkey (email, full_name)`,
      )
      .is('deleted_at', null)
      // Pending first regardless of filter: the queue is the reason an admin
      // opens this page, and burying it under approved listings defeats that.
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new Error(`getAdminBusinesses: ${error.message}`);

    return (data ?? []).map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      status: b.status,
      tier: b.tier,
      isVerified: b.is_verified,
      isDemo: b.is_demo,
      city: b.city,
      email: b.email,
      phone: b.phone,
      ratingAvg: Number(b.rating_avg),
      ratingCount: b.rating_count,
      submittedAt: b.submitted_at,
      createdAt: b.created_at,
      tagline: b.business_translations.find((t) => t.locale === locale)?.tagline ?? null,
      ownerEmail: b.profiles?.email ?? null,
      ownerName: b.profiles?.full_name ?? null,
    }));
  },
);

export const getAdminReviews = cache(async (status?: Enums<'review_status'>) => {
  const supabase = await createClient();

  let query = supabase
    .from('reviews')
    .select(
      `id, rating, title, body, locale, status, created_at, is_demo,
       businesses (name, slug),
       profiles!reviews_author_id_fkey (full_name, email)`,
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(`getAdminReviews: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    locale: r.locale,
    status: r.status,
    createdAt: r.created_at,
    businessName: r.businesses?.name ?? null,
    authorName: r.profiles?.full_name ?? null,
    authorEmail: r.profiles?.email ?? null,
  }));
});

/** Every enquiry, with how many operators received it. */
export const getAdminLeads = cache(async (locale: Locale, limit = 50) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('leads')
    .select(
      `id, reference, status, quality_score, full_name, email, adults, children,
       travel_start, created_at, distributed_at,
       destinations (destination_translations (locale, name)),
       lead_businesses (id, status)`,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getAdminLeads: ${error.message}`);

  return (data ?? []).map((l) => ({
    id: l.id,
    reference: l.reference,
    status: l.status,
    qualityScore: l.quality_score,
    fullName: l.full_name,
    email: l.email,
    travelers: l.adults + l.children,
    travelStart: l.travel_start,
    createdAt: l.created_at,
    distributedAt: l.distributed_at,
    destinationName:
      l.destinations?.destination_translations.find((x) => x.locale === locale)?.name ??
      null,
    recipientCount: l.lead_businesses.length,
    respondedCount: l.lead_businesses.filter((lb) =>
      ['responded', 'quoted', 'won'].includes(lb.status),
    ).length,
  }));
});

export const getAdminGuides = cache(async (locale: Locale) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('guides')
    .select(
      `id, status, is_featured, reading_minutes, published_at, view_count, allow_ads,
       guide_translations (locale, title, slug)`,
    )
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`getAdminGuides: ${error.message}`);

  return (data ?? []).map((g) => {
    const t = g.guide_translations.find((x) => x.locale === locale);
    return {
      id: g.id,
      status: g.status,
      isFeatured: g.is_featured,
      allowAds: g.allow_ads,
      readingMinutes: g.reading_minutes,
      publishedAt: g.published_at,
      viewCount: g.view_count,
      title: t?.title ?? '(untranslated)',
      slug: t?.slug ?? null,
      // Which locales this guide actually exists in — a partial translation set
      // would otherwise emit hreflang pointing at pages that 404.
      translatedLocales: g.guide_translations.map((x) => x.locale),
    };
  });
});

export const getAuditLog = cache(async (limit = 100) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, before, after, created_at, profiles (full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getAuditLog: ${error.message}`);

  return (data ?? []).map((a) => ({
    id: a.id,
    action: a.action,
    entityType: a.entity_type,
    entityId: a.entity_id,
    before: a.before,
    after: a.after,
    createdAt: a.created_at,
    actorName: a.profiles?.full_name ?? a.profiles?.email ?? null,
  }));
});

export const getPlatformSettings = cache(async () => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('platform_settings')
    .select('key, value, description, updated_at')
    .order('key');

  if (error) throw new Error(`getPlatformSettings: ${error.message}`);
  return data ?? [];
});
