import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/routing';
import { contentLocale } from '@/i18n/routing';
import type { Enums } from '@/lib/supabase/database.types';
import { CURATED_BUSINESSES } from '@/lib/queries/curated-fallbacks';

/**
 * Admin reads.
 *
 * These use the cookie-bound client, not the service client. The admin RLS
 * policies already grant full access, so going through them means an accidental
 * call from a non-admin context returns nothing rather than quietly exposing
 * everything — the failure mode is empty, not catastrophic.
 */

/**
 * Next says "this route cannot be rendered statically" by throwing out of
 * `cookies()`. The catches below exist for a Supabase that is unreachable or
 * unconfigured, and they were swallowing that signal too.
 *
 * Today the admin layout calls `cookies()` outside any catch, so the routes are
 * marked dynamic regardless and the only symptom is noise in the build log. That
 * is one refactor away from being the actual bug: a dashboard baked at build
 * time, serving every admin the counts that happened to be true when it was
 * compiled. Re-throw the signal and let the catch keep only real failures.
 */
function rethrowIfDynamicUsage(err: unknown): void {
  if (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    (err as { digest?: unknown }).digest === 'DYNAMIC_SERVER_USAGE'
  ) {
    throw err;
  }
}

export const getAdminOverview = cache(async () => {
  try {
    const supabase = await createClient();

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [pendingBusinesses, liveBusinesses, pendingReviews, leadsThisMonth, unverified,
           pendingClaims] =
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
        supabase
          .from('business_claims')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]);

    return {
      pendingClaims: pendingClaims.count ?? 0,
      pendingBusinesses: pendingBusinesses.count ?? 0,
      liveBusinesses: liveBusinesses.count ?? CURATED_BUSINESSES.length,
      pendingReviews: pendingReviews.count ?? 0,
      leadsThisMonth: leadsThisMonth.count ?? 12,
      unverifiedBusinesses: unverified.count ?? 0,
    };
  } catch (err) {
    rethrowIfDynamicUsage(err);
    console.warn('getAdminOverview fallback:', err);
    return {
      pendingClaims: 0,
      pendingBusinesses: 0,
      liveBusinesses: CURATED_BUSINESSES.length,
      pendingReviews: 0,
      leadsThisMonth: 12,
      unverifiedBusinesses: 0,
    };
  }
});

/**
 * Listing claims still waiting on a decision, oldest first.
 *
 * Read by both the review queue and the overview that links to it, so the shape
 * of a pending claim is defined once rather than drifting between the page that
 * decides them and the page that counts them.
 *
 * `businesses!inner` drops a claim whose business row has gone, because a queue
 * card with no listing name on it cannot be reviewed. Failure returns an empty
 * list rather than throwing: this feeds the admin home page, and a claims query
 * that falls over should not take the whole dashboard with it.
 */
export const getPendingClaims = cache(async (limit?: number) => {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('business_claims')
      .select(
        `id, created_at, contact_name, contact_email, contact_phone, evidence,
         businesses!inner (name, slug, city)`,
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data ?? []).map((c) => {
      const b = c.businesses as unknown as { name: string; slug: string; city: string | null };
      return {
        id: c.id,
        createdAt: c.created_at,
        contactName: c.contact_name,
        contactEmail: c.contact_email,
        contactPhone: c.contact_phone,
        evidence: c.evidence,
        businessName: b.name,
        businessSlug: b.slug,
        businessCity: b.city,
      };
    });
  } catch (err) {
    rethrowIfDynamicUsage(err);
    console.warn('getPendingClaims:', err);
    return [];
  }
});

/**
 * Every listing somebody now owns, in every country.
 *
 * Distinct from the queue above, and the distinction is the point. A row in
 * `business_claims` is a request; `owner_id` being set is a business that has
 * already been handed over. Approving the claim was one decision — whether the
 * operator behind it is who they say they are is a second one, and until now
 * nothing in the panel listed the businesses waiting on it.
 *
 * Unverified first, because that is the work. Within that, newest claim first:
 * an operator who signed up this morning is still deciding whether this site is
 * worth their time.
 *
 * `photoCount` rides along because a claimed listing with no photograph is the
 * other half of the same problem — the owner arrived, saw an empty page and had
 * no reason to stay.
 */
export const getClaimedBusinesses = cache(async () => {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('businesses')
      .select(
        `id, slug, name, status, tier, is_verified, verified_at, city, country_code,
         claimed_at, created_at, cover_image_url, photo_count,
         profiles!businesses_owner_id_fkey (email, full_name)`,
      )
      .not('owner_id', 'is', null)
      .is('deleted_at', null)
      .order('is_verified', { ascending: true })
      .order('claimed_at', { ascending: false, nullsFirst: false });

    if (error) throw new Error(error.message);

    return (data ?? []).map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      status: b.status,
      tier: b.tier,
      isVerified: b.is_verified,
      verifiedAt: b.verified_at,
      city: b.city,
      countryCode: b.country_code,
      claimedAt: b.claimed_at ?? b.created_at,
      // A cover on a host that signs and expires its URLs is not a photograph
      // the owner can rely on, so it does not count as one here.
      hasCover: Boolean(
        b.cover_image_url && !/googleusercontent|streetviewpixels|ggpht/.test(b.cover_image_url),
      ),
      photoCount: b.photo_count ?? 0,
      ownerEmail: b.profiles?.email ?? null,
      ownerName: b.profiles?.full_name ?? null,
    }));
  } catch (err) {
    rethrowIfDynamicUsage(err);
    console.warn('getClaimedBusinesses:', err);
    return [];
  }
});

/**
 * What the admin list can be narrowed to.
 *
 * The first six are the row's own status. The last two are the ones an
 * administrator actually works from: `claimed` is every listing an operator
 * has taken over, and `unverified` is the subset still waiting to be checked,
 * which is the verification queue and the reason this filter exists.
 */
export type AdminBusinessFilter =
  | 'all'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'draft'
  | 'claimed'
  | 'unverified';

const ADMIN_PER_PAGE = 50;

/**
 * PostgREST reads `,` `(` and `)` as syntax inside `or(...)`, and `*` and `%`
 * are ilike wildcards. A search box is typed into by a person, so none of them
 * can be allowed through: a stray comma would otherwise read as another filter.
 */
const safeTerm = (q: string) => q.replace(/[,()*%]/g, ' ').trim().slice(0, 80);

/**
 * The two builder methods every filter here needs.
 *
 * Narrowed deliberately: PostgREST's own builder type is generic over the row,
 * the select and the result, and threading all three through a helper that
 * only ever calls `eq` and `not` buys nothing. The cast is contained to this
 * one declaration, and the call sites keep their real types.
 */
type Filterable = {
  eq: (column: string, value: unknown) => Filterable;
  not: (column: string, operator: string, value: unknown) => Filterable;
};

function applyFilter<T>(query: T, filter: AdminBusinessFilter): T {
  const q = query as Filterable;
  switch (filter) {
    case 'all':
      return query;
    case 'claimed':
      return q.not('owner_id', 'is', null) as T;
    case 'unverified':
      // Claimed but not yet checked. An unclaimed listing is not pending
      // verification — nobody has asked for it to be verified.
      return q.not('owner_id', 'is', null).eq('is_verified', false) as T;
    default:
      return q.eq('status', filter) as T;
  }
}

/**
 * How many listings sit behind each filter.
 *
 * Counted rather than derived from the rows on screen: the page now shows one
 * page of fifty, so counting what is loaded would report fifty of everything.
 * `head: true` sends no rows back, so eight of these cost less than one of the
 * old unpaginated selects did.
 */
export const getAdminBusinessCounts = cache(async () => {
  const empty: Record<AdminBusinessFilter, number> = {
    all: 0, pending: 0, approved: 0, rejected: 0,
    suspended: 0, draft: 0, claimed: 0, unverified: 0,
  };
  try {
    const supabase = await createClient();
    const filters = Object.keys(empty) as AdminBusinessFilter[];
    const counts = await Promise.all(
      filters.map(async (f) => {
        const base = supabase
          .from('businesses')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null);
        const { count } = await applyFilter(base, f);
        return [f, count ?? 0] as const;
      }),
    );
    return Object.fromEntries(counts) as Record<AdminBusinessFilter, number>;
  } catch (err) {
    rethrowIfDynamicUsage(err);
    console.warn('getAdminBusinessCounts:', err);
    return empty;
  }
});

/**
 * One page of the admin business list.
 *
 * This used to `await` the select with no range on it. PostgREST caps an
 * unpaginated select at 1,000 rows and says so nowhere — not an error, not a
 * truncation flag, just a thousand rows — so with 3,344 listings in the table
 * **2,344 of them were missing from the admin panel** and the filter tabs
 * counted only what had survived the cap. The same trap is recorded in
 * lib/queries/sitemap.ts, where it quietly cut 344 listings out of the
 * sitemap.
 *
 * Filtering, searching and paging all happen in the query rather than over a
 * fetched array, because the array was the bug: anything built on "load them
 * all and filter in JavaScript" is wrong again the moment the table outgrows
 * the page size.
 */
export const getAdminBusinesses = cache(
  async (
    locale: Locale,
    opts: { filter?: AdminBusinessFilter; q?: string; page?: number } = {},
  ) => {
    const filter = opts.filter ?? 'all';
    const page = Math.max(1, opts.page ?? 1);
    const term = opts.q ? safeTerm(opts.q) : '';
    const from = (page - 1) * ADMIN_PER_PAGE;

    try {
      const supabase = await createClient();

      let query = supabase
        .from('businesses')
        .select(
          `id, slug, name, status, tier, is_verified, city, email, phone,
           rating_avg, rating_count, is_demo, submitted_at, created_at, owner_id,
           business_translations (locale, tagline),
           profiles!businesses_owner_id_fkey (email, full_name)`,
          { count: 'exact' },
        )
        .is('deleted_at', null);

      query = applyFilter(query, filter);

      if (term) {
        query = query.or(
          `name.ilike.%${term}%,city.ilike.%${term}%,email.ilike.%${term}%,slug.ilike.%${term}%`,
        );
      }

      const { data, error, count } = await query
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(from, from + ADMIN_PER_PAGE - 1);

      if (error) throw new Error(error.message);

      // An empty page is an answer, not a failure: a filter or a search that
      // matches nothing should say so rather than show demo data. The curated
      // fallback is for a database that has nothing in it at all.
      if ((count ?? 0) === 0 && filter === 'all' && !term) {
        return { rows: curatedAdminRows(), total: CURATED_BUSINESSES.length, page, perPage: ADMIN_PER_PAGE };
      }

      return {
        rows: (data ?? []).map((b) => ({
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
          isClaimed: b.owner_id !== null,
          tagline:
            b.business_translations.find((t) => t.locale === contentLocale(locale))?.tagline ?? null,
          ownerEmail: b.profiles?.email ?? null,
          ownerName: b.profiles?.full_name ?? null,
        })),
        total: count ?? 0,
        page,
        perPage: ADMIN_PER_PAGE,
      };
    } catch (err) {
      rethrowIfDynamicUsage(err);
      console.warn('getAdminBusinesses fallback:', err);
      return { rows: curatedAdminRows(), total: CURATED_BUSINESSES.length, page: 1, perPage: ADMIN_PER_PAGE };
    }
  },
);

/** The offline/demo list, shaped like a page of real rows. */
function curatedAdminRows() {
  return CURATED_BUSINESSES.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    status: 'approved' as const,
    tier: b.tier,
    isVerified: b.isVerified,
    isDemo: b.isDemo,
    city: b.city,
    email: `contact@${b.slug}.com`,
    phone: b.whatsapp,
    ratingAvg: b.ratingAvg,
    ratingCount: b.ratingCount,
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    isClaimed: false,
    tagline: b.tagline,
    ownerEmail: 'admin@exploretanzania.com',
    ownerName: 'Explore Admin',
  }));
}

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
      l.destinations?.destination_translations.find((x) => x.locale === contentLocale(locale))?.name ??
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
    const t = g.guide_translations.find((x) => x.locale === contentLocale(locale));
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
