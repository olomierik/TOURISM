import { cache } from 'react';

import type { Locale } from '@/i18n/routing';
import { contentLocale } from '@/i18n/routing';
import { createPublicClient } from '@/lib/supabase/public';
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
    return d.cover_image_url ? [{ src: d.cover_image_url, label: name ?? null }] : [];
  });

  return frames.length > 0 ? frames : CURATED_HERO_FRAMES;
});

/**
 * The one hero photograph — design.md §3.5 and §7.1.1.
 *
 * §3.5: "No autoplaying carousels or crossfading hero images. The current hero
 * swaps between two photos; **ship one LCP image**." getHeroFrames above
 * fetched eight destination covers so the hero could cycle; a visitor looking
 * at one homepage downloaded eight full-bleed images, on the mobile
 * connections most of this audience browses on, to see a picture change by
 * itself. The crossfade is gone, so seven of those requests are too.
 *
 * Tanzania only (§9.3), and featured-then-sort-order, so which photograph
 * leads is an editorial decision in the admin rather than whatever the database
 * returns first.
 *
 * Destination covers are the right source for a reason worth recording: they
 * are the one image set on this site that resolves. Every Tanzanian
 * destination cover is in Supabase storage and returns 200, where 29 of 30
 * sampled business photos return 403 (§5.2).
 */
export const getHeroPhoto = cache(
  async (locale: Locale): Promise<{ src: string; label: string | null } | null> => {
    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from('destinations')
      .select('cover_image_url, destination_translations!inner (locale, name)')
      .eq('destination_translations.locale', contentLocale(locale))
      .not('cover_image_url', 'is', null)
      .eq('is_active', true)
      .eq('country_code', 'TZ')
      .is('deleted_at', null)
      .order('is_featured', { ascending: false })
      .order('sort_order')
      .limit(1)
      .maybeSingle();

    // Decoration fails quietly; a hero that throws takes the homepage down.
    if (error || !data?.cover_image_url) {
      if (error) console.error('[hero] could not load a cover', error.message);
      const first = CURATED_HERO_FRAMES[0];
      return first ? { src: first.src, label: first.label ?? null } : null;
    }

    const name = (data.destination_translations as unknown as { name: string }[])[0]?.name ?? null;
    return { src: data.cover_image_url, label: name };
  },
);
