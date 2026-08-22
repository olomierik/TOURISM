import { cache } from 'react';

import { createPublicClient } from '@/lib/supabase/public';
import type { Locale } from '@/i18n/routing';
import type { Enums } from '@/lib/supabase/database.types';
import { normalizeSearchTerm } from './search-term';

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
};

export type DirectoryFilters = {
  q?: string;
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
  id, slug, name, logo_url, cover_image_url, city, is_verified, is_demo,
  tier, rating_avg, rating_count, response_rate, avg_response_minutes, whatsapp,
  business_translations!inner (locale, tagline, short_description)
`;

function toCard(b: {
  id: string;
  slug: string;
  name: string;
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
  business_translations: Array<{ tagline: string | null; short_description: string | null }>;
}): BusinessCard {
  const t = b.business_translations[0];
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    tagline: t?.tagline ?? null,
    shortDescription: t?.short_description ?? null,
    logoUrl: b.logo_url,
    coverImageUrl: b.cover_image_url,
    city: b.city,
    isVerified: b.is_verified,
    isDemo: b.is_demo,
    tier: b.tier,
    ratingAvg: Number(b.rating_avg),
    ratingCount: b.rating_count,
    responseRate: b.response_rate === null ? null : Number(b.response_rate),
    avgResponseMinutes: b.avg_response_minutes,
    whatsapp: b.whatsapp,
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
  const supabase = createPublicClient();
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
      `id, slug, name, logo_url, cover_image_url, city, address, latitude, longitude,
       email, phone, whatsapp, website, founded_year, team_size, license_number,
       is_verified, is_demo, tier, rating_avg, rating_count,
       response_rate, avg_response_minutes, published_at,
       business_translations!inner (
         locale, tagline, short_description, description, seo_title, seo_description
       ),
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

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    logoUrl: data.logo_url,
    coverImageUrl: data.cover_image_url,
    city: data.city,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    email: data.email,
    phone: data.phone,
    whatsapp: data.whatsapp,
    website: data.website,
    foundedYear: data.founded_year,
    teamSize: data.team_size,
    licenseNumber: data.license_number,
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
