import { cache } from 'react';

import { createPublicClient, createSearchClient } from '@/lib/supabase/public';
import type { Locale } from '@/i18n/routing';
import type { Enums } from '@/lib/supabase/database.types';
import { normalizeSearchTerm } from './search-term';
import { safeImageUrl } from '@/lib/images';

/**
 * Does this translation row say anything?
 *
 * The owner profile form writes a row for all four locales on the first save,
 * so row count is not a measure of how many languages a listing exists in. A
 * listing with an English description and three empty rows is translated into
 * one language, and anything reading these rows to decide what to advertise —
 * hreflang, the sitemap — has to ask about content rather than existence.
 */
export function hasContent(t: {
  tagline?: string | null;
  short_description?: string | null;
  description?: string | null;
}): boolean {
  return Boolean(t.tagline?.trim() || t.short_description?.trim() || t.description?.trim());
}

/** Postgres text-search configuration per locale, mirroring the `locales` table. */
const TS_CONFIG: Record<Locale, string> = {
  en: 'english',
  de: 'german',
  fr: 'french',
  it: 'italian',
};

export type BusinessCard = {
  id: string;
  slug: string;
  name: string;
  countryCode: string | null;
  tagline: string | null;
  shortDescription: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  city: string | null;
  isVerified: boolean;
  isDemo: boolean;
  tier: Enums<'subscription_tier'>;
  ratingAvg: number;
  ratingCount: number;
  responseRate: number | null;
  avgResponseMinutes: number | null;
  whatsapp: string | null;
  /** All-in per person per day, as the operator states it. */
  dayRateLow: number | null;
  dayRateHigh: number | null;
  dayRateCurrency: string;
  /** Null when the listing has no coordinates at all — 73 still do not. */
  lat: number | null;
  lng: number | null;
  /** 'city' is a centroid, not the operator's door. See migration 045. */
  precision: 'exact' | 'city' | null;
};

export type DirectoryFilters = {
  q?: string;
  /** ISO-3166 alpha-2. The directory spans four countries now. */
  countryCode?: string;
  destinationId?: string;
  categoryId?: string;
  minRating?: number;
  verifiedOnly?: boolean;
  maxPrice?: number;
  sort?: 'recommended' | 'rating' | 'name';
  page?: number;
  perPage?: number;
};

export type DirectoryResult = {
  items: BusinessCard[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

const SELECT_CARD = `
  id, slug, name, logo_url, cover_image_url, city, country_code, is_verified, is_demo,
  tier, rating_avg, rating_count, response_rate, avg_response_minutes, whatsapp,
  day_rate_low, day_rate_high, day_rate_currency,
  latitude, longitude, location_precision,
  business_translations!inner (locale, tagline, short_description)
`;

function toCard(b: {
  id: string;
  slug: string;
  name: string;
  country_code: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  city: string | null;
  is_verified: boolean;
  is_demo: boolean;
  tier: Enums<'subscription_tier'>;
  rating_avg: number;
  rating_count: number;
  response_rate: number | null;
  avg_response_minutes: number | null;
  whatsapp: string | null;
  day_rate_low: number | null;
  day_rate_high: number | null;
  day_rate_currency: string;
  latitude: number | null;
  longitude: number | null;
  location_precision: 'exact' | 'city' | null;
  business_translations: Array<{ tagline: string | null; short_description: string | null }>;
}): BusinessCard {
  const t = b.business_translations[0];

  // Numbers, not the numeric strings PostgREST sends, and only as a pair. A
  // half-parsed coordinate would put a pin at 0,0 — in the Gulf of Guinea,
  // which is far enough off to stretch a map's bounds across the Atlantic.
  const lat = b.latitude === null ? null : Number(b.latitude);
  const lng = b.longitude === null ? null : Number(b.longitude);
  const mappable = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    countryCode: b.country_code,
    tagline: t?.tagline ?? null,
    shortDescription: t?.short_description ?? null,
    logoUrl: safeImageUrl(b.logo_url),
    coverImageUrl: safeImageUrl(b.cover_image_url),
    city: b.city,
    isVerified: b.is_verified,
    isDemo: b.is_demo,
    tier: b.tier,
    ratingAvg: Number(b.rating_avg),
    ratingCount: b.rating_count,
    responseRate: b.response_rate === null ? null : Number(b.response_rate),
    avgResponseMinutes: b.avg_response_minutes,
    whatsapp: b.whatsapp,
    dayRateLow: b.day_rate_low,
    dayRateHigh: b.day_rate_high,
    dayRateCurrency: b.day_rate_currency,
    lat: mappable ? lat : null,
    lng: mappable ? lng : null,
    // Carried alongside the coordinate because the two are only meaningful
    // together: 'city' is a centroid that may sit twenty kilometres from the
    // door, and a map that draws it identically to a real position is telling
    // the same lie in pixels that a fabricated distance tells in numbers.
    precision: mappable ? (b.location_precision ?? 'city') : null,
  };
}

/**
 * The directory query: search, filter, sort, paginate.
 *
 * Default ordering is by tier descending. The enum is declared free < premium <
 * featured, so descending puts paying businesses first — which is the placement
 * they are buying. Rating breaks ties, so a paid listing still has to be good to
 * hold the top spot within its tier.
 */
export async function searchBusinesses(
  locale: Locale,
  filters: DirectoryFilters = {},
): Promise<DirectoryResult> {
  // The cache decision belongs to the caller's shape, not to this function.
  //
  // A free-text search is keyed by what the visitor typed, so caching it lets
  // the first person to search a term decide the answer for everyone — that is
  // how "tanzania" kept returning nothing long after 1,336 listings were
  // imported, while "lodge" worked because nobody had searched it before.
  //
  // A filter-only query has no such key. The combination pages call this with a
  // fixed category and destination and are statically generated; giving them a
  // no-store fetch makes the whole route dynamic and takes the commercial
  // surface out of the prerender, which is a far worse trade than five minutes
  // of staleness on a listing count.
  const supabase = filters.q?.trim() ? createSearchClient() : createPublicClient();
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(48, Math.max(1, filters.perPage ?? 12));
  const from = (page - 1) * perPage;

  // Relationship joins are added conditionally: making them unconditional would
  // silently drop any business that has no package, which would empty the
  // directory for anyone who has not filtered by price.
  const relations = [
    filters.categoryId ? 'business_categories!inner (category_id)' : '',
    filters.destinationId ? 'business_destinations!inner (destination_id)' : '',
    filters.maxPrice !== undefined ? 'packages!inner (price_from, status)' : '',
  ].filter(Boolean);

  const select = [SELECT_CARD, ...relations].join(',\n');

  let query = supabase
    .from('businesses')
    .select(select, { count: 'exact' })
    .eq('business_translations.locale', locale)
    .eq('status', 'approved')
    .is('deleted_at', null);

  if (filters.countryCode) {
    query = query.eq('country_code', filters.countryCode);
  }
  if (filters.categoryId) {
    query = query.eq('business_categories.category_id', filters.categoryId);
  }
  if (filters.destinationId) {
    query = query.eq('business_destinations.destination_id', filters.destinationId);
  }
  if (filters.maxPrice !== undefined) {
    query = query
      .eq('packages.status', 'published')
      .lte('packages.price_from', filters.maxPrice);
  }
  if (filters.minRating) {
    query = query.gte('rating_avg', filters.minRating);
  }
  if (filters.verifiedOnly) {
    query = query.eq('is_verified', true);
  }

  if (filters.q?.trim()) {
    // Folded to match the unaccented stored vectors — see search-term.ts.
    const term = normalizeSearchTerm(filters.q);
    // Search the translated copy in the visitor's own language, stemmed by that
    // language's dictionary. `websearch` accepts quotes and OR the way people
    // actually type into a search box.
    query = query.textSearch('business_translations.search_vector', term, {
      type: 'websearch',
      config: TS_CONFIG[locale],
    });
  }

  switch (filters.sort) {
    case 'rating':
      query = query.order('rating_avg', { ascending: false }).order('rating_count', {
        ascending: false,
      });
      break;
    case 'name':
      query = query.order('name', { ascending: true });
      break;
    default:
      query = query
        .order('tier', { ascending: false })
        .order('is_verified', { ascending: false })
        .order('rating_avg', { ascending: false });
  }

  const { data, error, count } = await query.range(from, from + perPage - 1);
  if (error) throw new Error(`searchBusinesses: ${error.message}`);

  const total = count ?? 0;
  return {
    // The conditional select makes the row shape vary, so it is narrowed here
    // rather than fought with generics at the call site.
    items: (data as unknown as Parameters<typeof toCard>[0][]).map(toCard),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** Businesses serving a destination, for the destination page. */
export const getBusinessesForDestination = cache(
  async (destinationId: string, locale: Locale, limit = 6) => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('businesses')
      .select(`${SELECT_CARD}, business_destinations!inner (destination_id)`)
      .eq('business_translations.locale', locale)
      .eq('business_destinations.destination_id', destinationId)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('tier', { ascending: false })
      .order('rating_avg', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`getBusinessesForDestination: ${error.message}`);
    return (data as unknown as Parameters<typeof toCard>[0][]).map(toCard);
  },
);

/** Featured businesses for the homepage. */
export const getFeaturedBusinesses = cache(async (locale: Locale, limit = 6) => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('businesses')
    .select(SELECT_CARD)
    .eq('business_translations.locale', locale)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .order('tier', { ascending: false })
    .order('rating_avg', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getFeaturedBusinesses: ${error.message}`);
  return (data as unknown as Parameters<typeof toCard>[0][]).map(toCard);
});

/** Full business profile. */
export const getBusinessBySlug = cache(async (slug: string, locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('businesses')
    .select(
      `id, slug, name, owner_id, country_code, logo_url, cover_image_url, city, address, latitude, longitude, location_precision,
       email, phone, whatsapp, website, founded_year, team_size, license_number,
       associations, day_rate_low, day_rate_high, day_rate_currency,
       is_verified, is_demo, tier, rating_avg, rating_count,
       response_rate, avg_response_minutes, published_at,
       business_translations!inner (
         locale, tagline, short_description, description, seo_title, seo_description
       ),
       all_translations:business_translations (locale, tagline, short_description, description),
       business_categories (category_id),
       business_destinations (destination_id, is_primary),
       business_services (
         id, price_from, currency, sort_order,
         business_service_translations (locale, name, description)
       )`,
    )
    .eq('business_translations.locale', locale)
    .eq('slug', slug)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`getBusinessBySlug: ${error.message}`);
  if (!data) return null;

  const t = data.business_translations[0];

  // hreflang must be built from the locales that actually exist. A business slug
  // is identical in every language, so advertising all four is tempting — but the
  // page 404s in any locale the listing is not translated into, and Google
  // discards a whole cluster when its alternates do not resolve. Exactly the
  // failure the guides had.
  //
  // Having a row is not the same as having a translation. The owner form writes a
  // business_translations row for every locale the moment a listing is saved, so
  // an untranslated listing carries four rows of which three are empty strings.
  // Testing for the row advertised three blank pages; testing for content is the
  // question that was always meant.
  const allSlugs = Object.fromEntries(
    (
      data.all_translations as unknown as Array<{
        locale: string;
        tagline: string | null;
        short_description: string | null;
        description: string | null;
      }>
    )
      .filter((x) => hasContent(x))
      .map((x) => [x.locale, data.slug]),
  ) as Partial<Record<Locale, string>>;

  return {
    allSlugs,
    id: data.id,
    slug: data.slug,
    name: data.name,
    // Seeded from public licensing records and not yet taken over by the
    // operator. The public page says so rather than presenting compiled data as
    // though the business had written it.
    isUnclaimed: data.owner_id === null,
    countryCode: data.country_code,
    logoUrl: safeImageUrl(data.logo_url),
    coverImageUrl: safeImageUrl(data.cover_image_url),
    city: data.city,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    locationPrecision: data.location_precision,
    email: data.email,
    phone: data.phone,
    whatsapp: data.whatsapp,
    website: data.website,
    foundedYear: data.founded_year,
    teamSize: data.team_size,
    licenseNumber: data.license_number,
    associations: data.associations,
    dayRateLow: data.day_rate_low,
    dayRateHigh: data.day_rate_high,
    dayRateCurrency: data.day_rate_currency,
    isVerified: data.is_verified,
    isDemo: data.is_demo,
    tier: data.tier,
    ratingAvg: Number(data.rating_avg),
    ratingCount: data.rating_count,
    responseRate: data.response_rate === null ? null : Number(data.response_rate),
    avgResponseMinutes: data.avg_response_minutes,
    tagline: t.tagline,
    shortDescription: t.short_description,
    description: t.description,
    seoTitle: t.seo_title,
    seoDescription: t.seo_description,
    categoryIds: data.business_categories.map((c) => c.category_id),
    destinationIds: data.business_destinations.map((d) => d.destination_id),
    services: data.business_services
      .map((s) => {
        const st = s.business_service_translations.find((x) => x.locale === locale);
        return {
          id: s.id,
          name: st?.name ?? null,
          description: st?.description ?? null,
          priceFrom: s.price_from === null ? null : Number(s.price_from),
          currency: s.currency,
          sortOrder: s.sort_order,
        };
      })
      .filter((s) => s.name)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
});

/** Slugs for generateStaticParams. Slugs are locale-independent for businesses. */
export const getAllBusinessSlugs = cache(async () => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('businesses')
    .select('slug')
    .eq('status', 'approved')
    .is('deleted_at', null);

  if (error) throw new Error(`getAllBusinessSlugs: ${error.message}`);
  return (data ?? []).map((b) => b.slug);
});

/**
 * Cards for a specific set of businesses, in the order the ids are given.
 *
 * Used by the saved-favourites page. Resolving through the card query rather
 * than storing a snapshot means a saved listing always shows its current name,
 * rating and cover — and a listing that has since been suspended or deleted
 * simply drops out rather than rendering a stale card that goes nowhere.
 */
export const getBusinessCardsByIds = cache(async (ids: string[], locale: Locale) => {
  if (!ids.length) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('businesses')
    .select(SELECT_CARD)
    .in('id', ids)
    .eq('business_translations.locale', locale)
    .eq('status', 'approved')
    .is('deleted_at', null);

  if (error) throw new Error(`getBusinessCardsByIds: ${error.message}`);

  const cards = (data as unknown as Parameters<typeof toCard>[0][]).map(toCard);
  // Preserve the caller's order, which is newest-saved-first.
  const byId = new Map(cards.map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
});
