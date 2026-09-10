import { cache } from 'react';

import { createPublicClient } from '@/lib/supabase/public';
import type { Locale } from '@/i18n/routing';
import { CURATED_PACKAGES } from '@/lib/queries/curated-fallbacks';

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
  business: { slug: string; name: string; isVerified: boolean } | null;
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
  cover_image_url, is_featured, is_demo,
  package_translations (locale, title, summary),
  businesses!inner (slug, name, is_verified, status, deleted_at),
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
  package_translations: Array<{ locale: string; title: string; summary: string | null }>;
  businesses: { slug: string; name: string; is_verified: boolean } | null;
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
    all.find((x) => x.locale === locale) ?? all.find((x) => x.locale === 'en') ?? all[0];
  const contentLocale = (t?.locale ?? 'en') as Locale;
  return {
    id: p.id,
    slug: p.slug,
    title: t?.title ?? '',
    summary: t?.summary ?? null,
    durationDays: p.duration_days,
    durationNights: p.duration_nights,
    priceFrom: p.price_from === null ? null : Number(p.price_from),
    currency: p.currency,
    priceUnit: p.price_unit,
    coverImageUrl: p.cover_image_url,
    isFeatured: p.is_featured,
    isDemo: p.is_demo,
    business: p.businesses
      ? { slug: p.businesses.slug, name: p.businesses.name, isVerified: p.businesses.is_verified }
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
        return (names.find((n) => n.locale === locale) ?? names.find((n) => n.locale === 'en'))
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

/** Full package detail, including the inclusion list the comparison view lines up. */
export const getPackageBySlug = cache(async (slug: string, locale: Locale) => {
  try {
    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from('packages')
      .select(
        `id, slug, duration_days, duration_nights, price_from, currency, price_unit,
         max_group_size, min_travelers, cover_image_url, is_featured, is_demo,
         package_translations!inner (
           locale, title, summary, description, itinerary, seo_title, seo_description
         ),
         businesses!inner (
           id, slug, name, logo_url, is_verified, whatsapp, phone, email,
           rating_avg, rating_count, response_rate, avg_response_minutes, status, deleted_at
         ),
         package_inclusions (
           id, is_included, sort_order,
           package_inclusion_translations (locale, label)
         ),
         package_destinations (destination_id),
         package_categories (category_id)`,
      )
      .eq('package_translations.locale', locale)
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
        categoryIds: ['cat-safari'],
        business: {
          id: 'biz-asilia',
          slug: found.business?.slug ?? 'asilia-africa',
          name: found.business?.name ?? 'Asilia Africa',
          logoUrl: null,
          isVerified: true,
          whatsapp: '+255 784 123 456',
          phone: '+255 784 123 456',
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
      priceFrom: data.price_from === null ? null : Number(data.price_from),
      currency: data.currency,
      priceUnit: data.price_unit,
      maxGroupSize: data.max_group_size,
      minTravelers: data.min_travelers,
      coverImageUrl: data.cover_image_url,
      isDemo: data.is_demo,
      destinationIds: data.package_destinations.map((d) => d.destination_id),
      categoryIds: data.package_categories.map((c) => c.category_id),
      business: {
        id: b.id,
        slug: b.slug,
        name: b.name,
        logoUrl: b.logo_url,
        isVerified: b.is_verified,
        whatsapp: b.whatsapp,
        phone: b.phone,
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
            i.package_inclusion_translations.find((x) => x.locale === locale)?.label ?? null,
        }))
        .filter((i) => i.label)
        .sort((a, b2) => a.sortOrder - b2.sortOrder),
    };
  } catch (err) {
    console.warn('getPackageBySlug fallback:', err);
    return null;
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
