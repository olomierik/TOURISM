import { cache } from 'react';

import type { Locale } from '@/i18n/routing';
import { contentLocale } from '@/i18n/routing';
import { createPublicClient } from '@/lib/supabase/public';
import { safeImageUrl } from '@/lib/images';
import { CURATED_HERO_FRAMES } from '@/lib/queries/curated-fallbacks';

/**
 * One destination photograph for a hero slot.
 *
 * Declared here rather than in a component: it used to live on the crossfading
 * backdrop that §3.5 removed, so the type outlived the thing it described.
 */
export type HeroFrame = { src: string; label: string | null };

/**
 * How many destination photographs join the homepage rotation.
 *
 * Deliberately far short of the full set. Every frame is a full-bleed image the
 * browser will eventually fetch, and a visitor should not download forty of them
 * to look at one homepage — particularly on the mobile connections most of this
 * audience browses on. Eight is enough for the hero to feel alive across a
 * normal visit.
 */
const MAX_FRAMES = 8;

/**
 * Destination covers for the homepage hero.
 *
 * Featured destinations first, then sort order, so the selection is editorial
 * rather than whatever the database happens to return. Read through the public
 * client to keep the homepage statically generated.
 */
export const getHeroFrames = cache(async (locale: Locale): Promise<HeroFrame[]> => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('destinations')
    .select('cover_image_url, is_featured, sort_order, destination_translations!inner (locale, name)')
    .eq('destination_translations.locale', contentLocale(locale))
    .not('cover_image_url', 'is', null)
    .eq('is_active', true)
    // §9.3: Tanzania by default on every surface. A slideshow that opens with
    // a Kenyan park on a site called Explore Tanzania is the same mistake the
    // destinations index was making.
    .eq('country_code', 'TZ')
    .is('deleted_at', null)
    .order('is_featured', { ascending: false })
    .order('sort_order')
    .limit(MAX_FRAMES);

  // A hero that falls back to the drawn scene is degraded; one that throws takes
  // the homepage down. This is decoration, so it fails quietly.
  if (error) {
    console.error('[hero] could not load destination covers', error.message);
    return CURATED_HERO_FRAMES;
  }

  const frames = (data ?? []).flatMap((d) => {
    const name = (d.destination_translations as unknown as { name: string }[])[0]?.name;
    // A frame we cannot render is worse here than anywhere else: it is the
    // first thing on the site, it holds the LCP, and a gap in the rotation
    // reads as a broken page rather than a missing photo.
    const src = safeImageUrl(d.cover_image_url);
    return src ? [{ src, label: name ?? null }] : [];
  });

  return frames.length > 0 ? frames : CURATED_HERO_FRAMES;
});

