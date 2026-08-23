import { cache } from 'react';

import { createPublicClient } from '@/lib/supabase/public';
import type { Locale } from '@/i18n/routing';

/**
 * Destination and category reads.
 *
 * Each function is wrapped in React's `cache` so a page that needs the same
 * destination in its metadata, its breadcrumb and its body hits the database
 * once per request rather than three times.
 *
 * Translations are joined with `!inner` throughout: a row whose translation for
 * the requested locale is missing must not render with an empty name, it must
 * simply not appear.
 */

export type DestinationSummary = {
  id: string;
  key: string;
  slug: string;
  name: string;
  summary: string | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
  isDemo: boolean;
};

export const getDestinations = cache(
  async (locale: Locale, opts: { featuredOnly?: boolean; limit?: number } = {}) => {
    const supabase = createPublicClient();

    let query = supabase
      .from('destinations')
      .select(
        `id, key, cover_image_url, is_featured, is_demo, sort_order,
         destination_translations!inner (locale, name, slug, summary)`,
      )
      .eq('destination_translations.locale', locale)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (opts.featuredOnly) query = query.eq('is_featured', true);
    if (opts.limit) query = query.limit(opts.limit);

    const { data, error } = await query;
    if (error) throw new Error(`getDestinations: ${error.message}`);

    return (data ?? []).map(
      (d): DestinationSummary => ({
        id: d.id,
        key: d.key,
        slug: d.destination_translations[0].slug,
        name: d.destination_translations[0].name,
        summary: d.destination_translations[0].summary,
        coverImageUrl: d.cover_image_url,
        isFeatured: d.is_featured,
        isDemo: d.is_demo,
      }),
    );
  },
);

export const getDestinationBySlug = cache(async (slug: string, locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('destinations')
    .select(
      `id, key, latitude, longitude, cover_image_url, is_demo,
       destination_translations!inner (
         locale, name, slug, summary, description, travel_tips, best_time,
         seo_title, seo_description
       )`,
    )
    .eq('destination_translations.locale', locale)
    .eq('destination_translations.slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`getDestinationBySlug: ${error.message}`);
  if (!data) return null;

  const t = data.destination_translations[0];
  return {
    id: data.id,
    key: data.key,
    latitude: data.latitude,
    longitude: data.longitude,
    coverImageUrl: data.cover_image_url,
    isDemo: data.is_demo,
    name: t.name,
    slug: t.slug,
    summary: t.summary,
    description: t.description,
    travelTips: t.travel_tips,
    bestTime: t.best_time,
    seoTitle: t.seo_title,
    seoDescription: t.seo_description,
  };
});

export type CategorySummary = {
  id: string;
  key: string;
  slug: string;
  name: string;
  nameSingular: string | null;
  summary: string | null;
  comboHeading: string | null;
  icon: string | null;
};

export const getCategories = cache(async (locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('categories')
    .select(
      `id, key, icon, sort_order,
       category_translations!inner (locale, name, name_singular, slug, summary, combo_heading)`,
    )
    .eq('category_translations.locale', locale)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`getCategories: ${error.message}`);

  return (data ?? []).map(
    (c): CategorySummary => ({
      id: c.id,
      key: c.key,
      slug: c.category_translations[0].slug,
      name: c.category_translations[0].name,
      nameSingular: c.category_translations[0].name_singular,
      summary: c.category_translations[0].summary,
      comboHeading: c.category_translations[0].combo_heading,
      icon: c.icon,
    }),
  );
});

export const getCategoryBySlug = cache(async (slug: string, locale: Locale) => {
  const categories = await getCategories(locale);
  return categories.find((c) => c.slug === slug) ?? null;
});

/**
 * Month-by-month conditions for a destination.
 *
 * Powers the seasonality widget. Returns an empty array when a destination has
 * no data rather than throwing, so the widget can simply not render.
 */
export const getSeasonality = cache(async (destinationId: string, locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('destination_seasonality')
    .select(
      `month, wildlife_rating, weather_rating, crowd_level, rainfall_mm,
       temp_min_c, temp_max_c, is_peak_season, highlight_key,
       destination_seasonality_translations (locale, highlight, note)`,
    )
    .eq('destination_id', destinationId)
    .order('month', { ascending: true });

  if (error) throw new Error(`getSeasonality: ${error.message}`);

  return (data ?? []).map((m) => {
    const tr = m.destination_seasonality_translations.find((t) => t.locale === locale);
    return {
      month: m.month,
      wildlife: m.wildlife_rating,
      weather: m.weather_rating,
      crowd: m.crowd_level,
      rainfallMm: m.rainfall_mm,
      tempMinC: m.temp_min_c,
      tempMaxC: m.temp_max_c,
      isPeak: m.is_peak_season,
      highlightKey: m.highlight_key,
      highlight: tr?.highlight ?? null,
      note: tr?.note ?? null,
    };
  });
});

/**
 * Every (category, destination) pair that has at least one approved business.
 *
 * Drives generateStaticParams for the commercial combination pages. Pairs with
 * no businesses are deliberately excluded: an indexed page listing nothing is
 * a thin-content signal, and there is no reason to generate it.
 */
export const getPopulatedComboPairs = cache(async (locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('business_categories')
    .select(
      `category_id,
       businesses!inner (id, status, deleted_at,
         business_destinations!inner (destination_id))`,
    )
    .eq('businesses.status', 'approved')
    .is('businesses.deleted_at', null);

  if (error) throw new Error(`getPopulatedComboPairs: ${error.message}`);

  const [categories, destinations] = await Promise.all([
    getCategories(locale),
    getDestinations(locale),
  ]);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const destinationById = new Map(destinations.map((d) => [d.id, d]));

  const pairs = new Set<string>();
  for (const row of data ?? []) {
    const category = categoryById.get(row.category_id);
    if (!category) continue;
    for (const bd of row.businesses.business_destinations) {
      const destination = destinationById.get(bd.destination_id);
      if (!destination) continue;
      pairs.add(`${category.slug}|${destination.slug}`);
    }
  }

  return [...pairs].map((p) => {
    const [category, destination] = p.split('|');
    return { category, destination };
  });
});
