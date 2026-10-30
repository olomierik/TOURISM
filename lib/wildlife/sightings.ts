import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { Sighting } from './types';

/**
 * The signed-in traveller's diary, newest first. `user` is null for visitors,
 * which every caller treats as "show the sign-in prompt", never as an error.
 *
 * If the diary table has not been created yet (migration 070 not applied),
 * the guide still renders: the read fails quietly and the diary reads empty.
 */
export async function getMySightings(): Promise<{
  user: { id: string } | null;
  sightings: Sighting[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, sightings: [] };

  const { data, error } = await supabase
    .from('wildlife_sightings')
    .select('id, species_slug, seen_on, place_name, lat, lng, notes, photo_url, created_at')
    .order('seen_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('[sightings] read failed', error.message);
    return { user: { id: user.id }, sightings: [] };
  }
  return { user: { id: user.id }, sightings: data ?? [] };
}
