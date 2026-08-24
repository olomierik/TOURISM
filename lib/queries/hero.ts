import { cache } from 'react';

import type { Locale } from '@/i18n/routing';
import { createPublicClient } from '@/lib/supabase/public';
import type { HeroFrame } from '@/components/home/hero-backdrop';

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
    .eq('destination_translations.locale', locale)
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
    return [];
  }

  return (data ?? []).flatMap((d) => {
    const name = (d.destination_translations as unknown as { name: string }[])[0]?.name;
    return d.cover_image_url ? [{ src: d.cover_image_url, label: name ?? null }] : [];
  });
});
