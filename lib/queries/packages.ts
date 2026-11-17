import { cache } from 'react';

import { createPublicClient } from '@/lib/supabase/public';
import { safeImageUrl } from '@/lib/images';
import { contentLocale as readLocale, type Locale } from '@/i18n/routing';
import { CURATED_PACKAGES } from '@/lib/queries/curated-fallbacks';
import type { TripActivityValue, TripIntentValue } from '@/lib/taxonomy/trip';
import { RATE_MARKUP_PERCENT, withMarkup } from '@/lib/pricing/markup';

export type PackageCard = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  durationDays: number | null;
  durationNights: number | null;
  priceFrom: number | null;
  currency: string;
  priceUnit: string;
  coverImageUrl: string | null;
  isFeatured: boolean;
  isDemo: boolean;
  /** Largest group the operator takes. Optional: curated samples do not know it. */
  maxGroupSize?: number | null;
  /**
   * The four answers a tour card gives before the click (migration 091):
   * comfort, whether the vehicle is shared, where it starts, and whether the
   * operator will change it. Optional — the operator may not have said, and
   * the curated samples never do.
   */
  comfortLevel?: 'budget' | 'midrange' | 'luxury' | null;
  tourStyle?: 'private' | 'shared' | null;
  startCity?: string | null;
  isCustomizable?: boolean;
  /**
   * The operator behind the trip. The rating and reply time are the
   * operator's: packages have no reviews of their own, and a shopper choosing
   * a trip is choosing who runs it. Optional for the curated samples.
   */
  business: {
    slug: string;
    name: string;
    isVerified: boolean;
    ratingAvg?: number;
    ratingCount?: number;
    avgResponseMinutes?: number | null;
  } | null;
  /** Where the trip goes, in saved order. The line a shopper scans first. */
  visits: string[];
  /**
   * The locale the title and summary are actually written in, which is not
   * always the locale of the page showing them. The card links with this so a
   * German reader is sent to the page that exists rather than a 404.
   */
  contentLocale: Locale;
};

const SELECT_CARD = `
  id, slug, duration_days, duration_nights, price_from, currency, price_unit,
  cover_image_url, is_featured, is_demo, max_group_size,
  comfort_level, tour_style, start_city, is_customizable,
  package_translations (locale, title, summary),
  businesses!inner (slug, name, is_verified, status, deleted_at, rating_avg, rating_count, avg_response_minutes, rate_markup_opt_out),
  package_destinations (
    sort_order,
    destinations (destination_translations (locale, name))
  )
`;

type RawPackage = {
  id: string;
  slug: string;
  duration_days: number | null;
  duration_nights: number | null;
  price_from: number | null;
  currency: string;
  price_unit: string;
  cover_image_url: string | null;
  is_featured: boolean;
  is_demo: boolean;
  max_group_size: number | null;
  comfort_level?: string | null;
  tour_style?: string | null;
  start_city?: string | null;
  is_customizable?: boolean;
  package_translations: Array<{ locale: string; title: string; summary: string | null }>;
  businesses: {
    slug: string;
    name: string;
    is_verified: boolean;
    rating_avg: number | string | null;
    rating_count: number | null;
    avg_response_minutes: number | null;
    rate_markup_opt_out?: boolean;
  } | null;
  package_destinations?: Array<{
    sort_order: number;
    destinations: { destination_translations: Array<{ locale: string; name: string }> } | null;
  }>;
};

function toCard(p: RawPackage, locale: Locale): PackageCard {
  // The reader's language if the operator wrote it, English otherwise, and
  // failing both whatever exists. Showing an English title on a German page is
  // what every marketplace in this niche does; showing nothing is what we did.
  const all = p.package_translations ?? [];
  const t =
    all.find((x) => x.locale === readLocale(locale)) ?? all.find((x) => x.locale === 'en') ?? all[0];
  const contentLocale = (t?.locale ?? 'en') as Locale;
  return {
    id: p.id,
    slug: p.slug,
    title: t?.title ?? '',
    summary: t?.summary ?? null,
    durationDays: p.duration_days,
    durationNights: p.duration_nights,
    priceFrom: withMarkup(p.price_from, p.businesses?.rate_markup_opt_out),
    currency: p.currency,
    priceUnit: p.price_unit,
    coverImageUrl: safeImageUrl(p.cover_image_url),
    isFeatured: p.is_featured,
    isDemo: p.is_demo,
    maxGroupSize: p.max_group_size,
    comfortLevel: (p.comfort_level ?? null) as PackageCard['comfortLevel'],
    tourStyle: (p.tour_style ?? null) as PackageCard['tourStyle'],
    startCity: p.start_city ?? null,
    isCustomizable: p.is_customizable ?? false,
    business: p.businesses
      ? {
          slug: p.businesses.slug,
          name: p.businesses.name,
          isVerified: p.businesses.is_verified,
          ratingAvg: Number(p.businesses.rating_avg ?? 0),
          ratingCount: p.businesses.rating_count ?? 0,
          avgResponseMinutes: p.businesses.avg_response_minutes,
        }
      : null,
    // Saved order, named in the reader's language.
    //
    // The locale is picked here rather than filtered in the query on purpose:
    // an .eq() on a nested embed turns it into an inner join, which would drop
    // every trip that visits a destination missing a translation — losing the
    // trip to save a word. Falling back to English loses the word instead.
    visits: [...(p.package_destinations ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((d) => {
        const names = d.destinations?.destination_translations ?? [];
        return (names.find((n) => n.locale === readLocale(locale)) ?? names.find((n) => n.locale === 'en'))
          ?.name;
      })
      .filter((n): n is string => Boolean(n)),
    contentLocale,
  };
}

/** Packages visiting a destination, cheapest first — the comparison entry point. */
export const getPackagesForDestination = cache(
  async (destinationId: string, locale: Locale, limit = 6) => {
    try {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from('packages')
        // Aliased. SELECT_CARD already embeds package_destinations to build the
        // "visits" line; embedding the same relation twice unaliased is ambiguous
        // to PostgREST. This second copy exists only to inner-join the filter.
        .select(`${SELECT_CARD}, visited:package_destinations!inner (destination_id)`)
        .eq('visited.destination_id', destinationId)
        .eq('status', 'published')
        .eq('businesses.status', 'approved')
        .is('deleted_at', null)
        .order('is_featured', { ascending: false })
        .order('price_from', { ascending: true, nullsFirst: false })
        .limit(limit);

      if (error || !data || data.length === 0) {
        const fallback = CURATED_PACKAGES[locale] || CURATED_PACKAGES.en;
        return fallback.slice(0, limit);
      }
      return (data as unknown as RawPackage[])
        .map((r) => toCard(r, locale))
        .filter((c) => c.title);
    } catch (err) {
      console.warn('getPackagesForDestination fallback:', err);
      const fallback = CURATED_PACKAGES[locale] || CURATED_PACKAGES.en;
      return fallback.slice(0, limit);
    }
  },
);

export const getPackagesForBusiness = cache(async (businessId: string, locale: Locale) => {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('packages')
      .select(SELECT_CARD)
      .eq('business_id', businessId)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('is_featured', { ascending: false })
      .order('price_from', { ascending: true, nullsFirst: false });

    if (error || !data || data.length === 0) {
      const fallback = CURATED_PACKAGES[locale] || CURATED_PACKAGES.en;
      return fallback.slice(0, 3);
    }
    return (data as unknown as RawPackage[])
      .map((r) => toCard(r, locale))
      .filter((c) => c.title);
  } catch (err) {
    console.warn('getPackagesForBusiness fallback:', err);
    const fallback = CURATED_PACKAGES[locale] || CURATED_PACKAGES.en;
    return fallback.slice(0, 3);
  }
});

export type TourFilters = {
  destinationId?: string;
  /** ISO-3166 alpha-2: tours that visit a destination in this country. */
  countryCode?: string;
  /** Tours run by an operator who offers this trip type / activity. */
  intent?: TripIntentValue;
  activity?: TripActivityValue;
  /** Inclusive bounds on length in days. */
  minDays?: number;
  maxDays?: number;
  /** Ceiling on the "from" price, in the package's own currency. */
  maxPrice?: number;
  comfort?: 'budget' | 'midrange' | 'luxury';
  style?: 'private' | 'shared';
  sort?: 'recommended' | 'price' | 'duration';
  page?: number;
  perPage?: number;
};

/**
 * The tour search (owner's call, 14 November 2026 — the SafariBookings
 * direction). Their product is a searchable list of tours; ours had tour
 * pages and no list, so a tour could be reached from its operator's listing
 * or a destination page and from nowhere a traveller starts.
 *
 * No curated fallback, unlike its neighbours. Those pad a section of another
 * page; this is a search, and a search that answers "no tours match" with six
 * sample tours that do not match either is lying about the inventory.
 *
 * Ranking is stated on the page that calls this. Recommended is: featured
 * first, then the operator's review count and rating, then price — the same
 * shape the directory uses, so the two lists do not disagree about who is
 * good.
 */
export async function searchPackages(
  locale: Locale,
  filters: TourFilters = {},
): Promise<{ items: PackageCard[]; total: number }> {
  const perPage = Math.min(Math.max(filters.perPage ?? 12, 1), 48);
  const page = Math.max(filters.page ?? 1, 1);
  const from = (page - 1) * perPage;

  try {
    const supabase = createPublicClient();

    // Trip type and activity belong to the operator, not the tour, so they
    // narrow to the operators who offer them first.
    let operatorIds: string[] | null = null;
    for (const [table, column, value] of [
      ['business_intents', 'intent', filters.intent],
      ['business_activities', 'activity', filters.activity],
    ] as const) {
      if (!value) continue;
      const { data: rows, error: idsError } = await supabase
        .from(table)
        .select('business_id')
        .eq(column as never, value as never);
      if (idsError) {
        console.warn('searchPackages operators:', idsError.message);
        return { items: [], total: 0 };
      }
      const ids = new Set((rows ?? []).map((r) => (r as { business_id: string }).business_id));
      operatorIds = operatorIds ? operatorIds.filter((id) => ids.has(id)) : [...ids];
      if (!operatorIds.length) return { items: [], total: 0 };
    }

    const country = filters.countryCode?.trim().toUpperCase();
    const select =
      filters.destinationId || country
        ? `${SELECT_CARD}, visited:package_destinations!inner (destination_id, destinations!inner (country_code))`
        : SELECT_CARD;

    let query = supabase
      .from('packages')
      .select(select, { count: 'exact' })
      .eq('status', 'published')
      .eq('businesses.status', 'approved')
      .is('deleted_at', null);

    if (filters.destinationId) query = query.eq('visited.destination_id', filters.destinationId);
    if (country) query = query.eq('visited.destinations.country_code', country);
    if (operatorIds) query = query.in('business_id', operatorIds);
    if (filters.minDays) query = query.gte('duration_days', filters.minDays);
    if (filters.maxDays) query = query.lte('duration_days', filters.maxDays);
    // Against the price the traveller sees, which carries the 10% marketing
    // budget, while the column holds the operator's own figure. Compared raw,
    // a tour shown at $1,100 passed "Up to $1,000". Same correction as the
    // directory's price filter in businesses.ts; for an operator who opted out
    // it is up to 10% strict, the error a traveller would rather have.
    if (filters.maxPrice) {
      query = query.lte('price_from', filters.maxPrice / (1 + RATE_MARKUP_PERCENT / 100));
    }
    if (filters.comfort) query = query.eq('comfort_level', filters.comfort);
    if (filters.style) query = query.eq('tour_style', filters.style);

    if (filters.sort === 'price') {
      query = query.order('price_from', { ascending: true, nullsFirst: false });
    } else if (filters.sort === 'duration') {
      query = query.order('duration_days', { ascending: true, nullsFirst: false });
    } else {
      query = query
        .order('is_featured', { ascending: false })
        .order('rating_count', { referencedTable: 'businesses', ascending: false })
        .order('price_from', { ascending: true, nullsFirst: false });
    }

    const { data, error, count } = await query.range(from, from + perPage - 1);
    if (error) {
      console.warn('searchPackages:', error.message);
      return { items: [], total: 0 };
    }
    return {
      items: (data as unknown as RawPackage[]).map((r) => toCard(r, locale)).filter((c) => c.title),
      total: count ?? 0,
    };
  } catch (err) {
    console.warn('searchPackages:', err);
    return { items: [], total: 0 };
  }
}

/** Full package detail, including the inclusion list the comparison view lines up. */
export const getPackageBySlug = cache(async (slug: string, locale: Locale) => {
  try {
    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from('packages')
      .select(
        `id, slug, duration_days, duration_nights, price_from, currency, price_unit,
         max_group_size, min_travelers, cover_image_url, is_featured, is_demo,
         comfort_level, tour_style, start_city, is_customizable,
         package_translations!inner (
           locale, title, summary, description, itinerary, seo_title, seo_description
         ),
         businesses!inner (
           id, slug, name, logo_url, is_verified, whatsapp, phone, email, country_code,
           rating_avg, rating_count, response_rate, avg_response_minutes, status, deleted_at,
           rate_markup_opt_out
         ),
         package_inclusions (
           id, is_included, sort_order,
           package_inclusion_translations (locale, label)
         ),
         package_destinations (destination_id, sort_order),
         package_categories (category_id)`,
      )
      .eq('package_translations.locale', readLocale(locale))
      .eq('slug', slug)
      .eq('status', 'published')
      .eq('businesses.status', 'approved')
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.warn(`getPackageBySlug error: ${error.message}`);
    }
    if (!data) {
      const fallbackList = CURATED_PACKAGES[locale] || CURATED_PACKAGES.en;
      const found = fallbackList.find((p) => p.slug === slug);
      if (!found) return null;
      return {
        id: found.id,
        slug: found.slug,
        title: found.title,
        summary: found.summary,
        description: `${found.title}. Comprehensive guided safari itinerary exploring Tanzania's finest wildlife sanctuaries with expert licensed Tanzanian guides and dedicated 4x4 safari vehicles.`,
        itinerary: 'Day 1: Arrival & Briefing\nDay 2: Morning & Afternoon Game Drives\nDay 3: Scenic Migration Tracking\nDay 4: Caldera Descent & Wildlife Exploration\nDay 5: Return Flight / Transfer',
        seoTitle: `${found.title} | Explore Tanzania`,
        seoDescription: found.summary ?? undefined,
        durationDays: found.durationDays,
        durationNights: found.durationNights,
        priceFrom: found.priceFrom,
        currency: found.currency,
        priceUnit: found.priceUnit,
        maxGroupSize: 7,
        minTravelers: 2,
        coverImageUrl: found.coverImageUrl,
        isDemo: false,
        destinationIds: ['dest-serengeti'],
        comfortLevel: null as 'budget' | 'midrange' | 'luxury' | null,
        tourStyle: null as 'private' | 'shared' | null,
        startCity: null as string | null,
        isCustomizable: false,
        categoryIds: ['cat-safari'],
        business: {
          id: 'biz-asilia',
          slug: found.business?.slug ?? 'asilia-africa',
          name: found.business?.name ?? 'Asilia Africa',
          logoUrl: null,
          isVerified: true,
          whatsapp: '+255 784 123 456',
          phone: '+255 784 123 456',
          countryCode: 'TZ' as string | null,
          email: 'safaris@explore-tanzania.com',
          ratingAvg: 4.9,
          ratingCount: 84,
          responseRate: 98,
          avgResponseMinutes: 45,
        },
        inclusions: [
          { id: 'inc-1', isIncluded: true, sortOrder: 1, label: 'Full board safari accommodation' },
          { id: 'inc-2', isIncluded: true, sortOrder: 2, label: 'All National Park fees & conservation charges' },
          { id: 'inc-3', isIncluded: true, sortOrder: 3, label: 'Custom 4x4 Land Cruiser with pop-up roof' },
          { id: 'inc-4', isIncluded: true, sortOrder: 4, label: 'Professional English-speaking safari guide' },
          { id: 'inc-5', isIncluded: false, sortOrder: 5, label: 'International flights and tourist visas' },
        ],
      };
    }

    const t = data.package_translations[0];
    const b = data.businesses;

    return {
      id: data.id,
      slug: data.slug,
      title: t.title,
      summary: t.summary,
      description: t.description,
      itinerary: t.itinerary,
      seoTitle: t.seo_title,
      seoDescription: t.seo_description,
      durationDays: data.duration_days,
      durationNights: data.duration_nights,
      priceFrom: withMarkup(
        data.price_from,
        (data.businesses as { rate_markup_opt_out?: boolean } | null)?.rate_markup_opt_out,
      ),
      currency: data.currency,
      priceUnit: data.price_unit,
      maxGroupSize: data.max_group_size,
      minTravelers: data.min_travelers,
      coverImageUrl: safeImageUrl(data.cover_image_url),
      isDemo: data.is_demo,
      // In the order the operator saved them: this is the route.
      destinationIds: [...data.package_destinations]
        .sort((a, b2) => (a.sort_order ?? 0) - (b2.sort_order ?? 0))
        .map((d) => d.destination_id),
      comfortLevel: (data.comfort_level ?? null) as 'budget' | 'midrange' | 'luxury' | null,
      tourStyle: (data.tour_style ?? null) as 'private' | 'shared' | null,
      startCity: data.start_city ?? null,
      isCustomizable: data.is_customizable ?? false,
      categoryIds: data.package_categories.map((c) => c.category_id),
      business: {
        id: b.id,
        slug: b.slug,
        name: b.name,
        logoUrl: b.logo_url,
        isVerified: b.is_verified,
        whatsapp: b.whatsapp,
        phone: b.phone,
        countryCode: b.country_code,
        email: b.email,
        ratingAvg: Number(b.rating_avg),
        ratingCount: b.rating_count,
        responseRate: b.response_rate === null ? null : Number(b.response_rate),
        avgResponseMinutes: b.avg_response_minutes,
      },
      inclusions: data.package_inclusions
        .map((i) => ({
          id: i.id,
          isIncluded: i.is_included,
          sortOrder: i.sort_order,
          label:
            i.package_inclusion_translations.find((x) => x.locale === readLocale(locale))?.label ?? null,
        }))
        .filter((i) => i.label)
        .sort((a, b2) => a.sortOrder - b2.sortOrder),
    };
  } catch (err) {
    console.warn('getPackageBySlug fallback:', err);
    return null;
  }
});

/** Saved packages, newest first as given, for the Saved page. Drops unpublished ones. */
export const getPackageCardsByIds = cache(async (ids: string[], locale: Locale) => {
  if (ids.length === 0) return [];
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('packages')
      .select(SELECT_CARD)
      .in('id', ids)
      .eq('status', 'published')
      .eq('businesses.status', 'approved')
      .is('deleted_at', null);
    if (error || !data) return [];
    const byId = new Map(
      (data as unknown as RawPackage[]).map((r) => [r.id, toCard(r, locale)] as const),
    );
    return ids
      .map((id) => byId.get(id))
      .filter((c): c is PackageCard => Boolean(c && c.title));
  } catch (err) {
    console.warn('getPackageCardsByIds failed:', err);
    return [];
  }
});

/** Several packages at once, for the side-by-side comparison view. */
export const getPackagesBySlugs = cache(async (slugs: string[], locale: Locale) => {
  if (slugs.length === 0) return [];
  const resolved = await Promise.all(slugs.map((s) => getPackageBySlug(s, locale)));
  return resolved.filter((p): p is NonNullable<typeof p> => p !== null);
});

export const getAllPackageSlugs = cache(async () => {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('packages')
      .select('slug')
      .eq('status', 'published')
      .is('deleted_at', null);

    if (error || !data || data.length === 0) {
      return CURATED_PACKAGES.en.map((p) => p.slug);
    }
    return data.map((p) => p.slug);
  } catch (err) {
    console.warn('getAllPackageSlugs fallback:', err);
    return CURATED_PACKAGES.en.map((p) => p.slug);
  }
});

/**
 * Just enough about every published tour to count matches in the browser:
 * the places it visits and its length. Feeds the home page's tour finder,
 * whose button says how many tours match before it is pressed — "Show 5,912
 * Tours" on SafariBookings. Counting on the client means no request per
 * change of filter; at nine tours, or nine hundred, the list is a few KB.
 */
/** What the homepage tour search counts against: one row per published tour. */
export type TourFacet = {
  destinationIds: string[];
  /** Countries the tour visits (its destinations' countries). */
  countries: string[];
  /** The operator's trip types and activities (business_intents/activities). */
  intents: string[];
  activities: string[];
  days: number | null;
};

export const getTourFacets = cache(async (): Promise<TourFacet[]> => {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('packages')
      .select(
        `duration_days,
         package_destinations (destination_id, destinations (country_code)),
         businesses!inner (status, business_intents (intent), business_activities (activity))`,
      )
      .eq('status', 'published')
      .eq('businesses.status', 'approved')
      .is('deleted_at', null);
    if (error || !data) return [];
    type Row = {
      duration_days: number | null;
      package_destinations: Array<{ destination_id: string; destinations: { country_code: string | null } | null }> | null;
      businesses: {
        business_intents: Array<{ intent: string }> | null;
        business_activities: Array<{ activity: string }> | null;
      } | null;
    };
    return (data as unknown as Row[]).map((p) => ({
      destinationIds: (p.package_destinations ?? []).map((d) => d.destination_id),
      countries: [
        ...new Set(
          (p.package_destinations ?? [])
            .map((d) => d.destinations?.country_code?.toUpperCase())
            .filter((c): c is string => Boolean(c)),
        ),
      ],
      intents: (p.businesses?.business_intents ?? []).map((i) => i.intent),
      activities: (p.businesses?.business_activities ?? []).map((a) => a.activity),
      days: p.duration_days,
    }));
  } catch {
    return [];
  }
});
