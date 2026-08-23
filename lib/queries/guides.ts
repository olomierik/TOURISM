import { cache } from 'react';

import { createPublicClient } from '@/lib/supabase/public';
import type { Locale } from '@/i18n/routing';

export type GuideCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  readingMinutes: number | null;
  publishedAt: string | null;
  isFeatured: boolean;
  isDemo: boolean;
};

const SELECT_CARD = `
  id, cover_image_url, reading_minutes, published_at, is_featured, is_demo, sort_order,
  guide_translations!inner (locale, title, slug, excerpt)
`;

type RawGuide = {
  id: string;
  cover_image_url: string | null;
  reading_minutes: number | null;
  published_at: string | null;
  is_featured: boolean;
  is_demo: boolean;
  guide_translations: Array<{ title: string; slug: string; excerpt: string | null }>;
};

function toCard(g: RawGuide): GuideCard {
  const t = g.guide_translations[0];
  return {
    id: g.id,
    slug: t.slug,
    title: t.title,
    excerpt: t.excerpt,
    coverImageUrl: g.cover_image_url,
    readingMinutes: g.reading_minutes,
    publishedAt: g.published_at,
    isFeatured: g.is_featured,
    isDemo: g.is_demo,
  };
}

export const getGuides = cache(
  async (locale: Locale, opts: { limit?: number; destinationId?: string } = {}) => {
    const supabase = createPublicClient();

    let query = supabase
      .from('guides')
      .select(SELECT_CARD)
      .eq('guide_translations.locale', locale)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true });

    if (opts.destinationId) query = query.eq('primary_destination_id', opts.destinationId);
    if (opts.limit) query = query.limit(opts.limit);

    const { data, error } = await query;
    if (error) throw new Error(`getGuides: ${error.message}`);
    return (data as unknown as RawGuide[]).map(toCard);
  },
);

export const getGuideBySlug = cache(async (slug: string, locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('guides')
    .select(
      `id, cover_image_url, reading_minutes, published_at, is_demo, allow_ads,
       primary_destination_id, primary_category_id,
       guide_translations!inner (
         locale, title, slug, excerpt, body, seo_title, seo_description
       ),
       all_translations:guide_translations (locale, slug)`,
    )
    .eq('guide_translations.locale', locale)
    .eq('guide_translations.slug', slug)
    .eq('status', 'published')
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`getGuideBySlug: ${error.message}`);
  if (!data) return null;

  const t = data.guide_translations[0];

  // See the note in taxonomy.ts: guide slugs are translated too, so hreflang has
  // to come from the real per-locale slugs.
  const allSlugs = Object.fromEntries(
    data.all_translations.map((x) => [x.locale, x.slug]),
  ) as Partial<Record<Locale, string>>;

  return {
    id: data.id,
    slug: t.slug,
    allSlugs,
    title: t.title,
    excerpt: t.excerpt,
    body: t.body,
    seoTitle: t.seo_title,
    seoDescription: t.seo_description,
    coverImageUrl: data.cover_image_url,
    readingMinutes: data.reading_minutes,
    publishedAt: data.published_at,
    isDemo: data.is_demo,
    // Whether this specific guide may carry ads. Ads are confined to guide
    // routes, and an individual guide can still opt out.
    allowAds: data.allow_ads,
    primaryDestinationId: data.primary_destination_id,
    primaryCategoryId: data.primary_category_id,
  };
});

/** Slugs per locale — guide slugs differ by locale, unlike business slugs. */
export const getAllGuideSlugs = cache(async (locale: Locale) => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('guide_translations')
    .select('slug, guides!inner (status, deleted_at)')
    .eq('locale', locale)
    .eq('guides.status', 'published')
    .is('guides.deleted_at', null);

  if (error) throw new Error(`getAllGuideSlugs: ${error.message}`);
  return (data ?? []).map((g) => g.slug);
});
