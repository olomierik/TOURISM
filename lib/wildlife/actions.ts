'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { getSpecies } from './species';

/**
 * Writing to a traveller's sightings diary (migration 070).
 *
 * Every write goes through the signed-in client, so the row-level policy is
 * what actually decides: a traveller can only add, see and remove their own
 * sightings. The checks here exist to give a useful message, not to guard.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const BUCKET = 'sighting-photos';

export type SightingState = {
  error?: 'notSignedIn' | 'badSpecies' | 'badDate' | 'tooLarge' | 'wrongType' | 'generic';
  success?: boolean;
};

function text(formData: FormData, key: string, max: number): string | null {
  const v = String(formData.get(key) ?? '').trim();
  return v ? v.slice(0, max) : null;
}

function coordinate(formData: FormData, key: string, limit: number): number | null {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

export async function logSighting(
  _prev: SightingState,
  formData: FormData,
): Promise<SightingState> {
  const slug = String(formData.get('species') ?? '');
  if (!getSpecies(slug)) return { error: 'badSpecies' };

  const seenOn = String(formData.get('seenOn') ?? '');
  const today = new Date().toISOString().slice(0, 10);
  if (!DATE.test(seenOn) || seenOn > today || seenOn < '1950-01-01') {
    return { error: 'badDate' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notSignedIn' };

  let lat = coordinate(formData, 'lat', 90);
  let lng = coordinate(formData, 'lng', 180);
  if (lat === null || lng === null) lat = lng = null;

  let photoPath: string | null = null;
  let photoUrl: string | null = null;
  const file = formData.get('photo');
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return { error: 'tooLarge' };
    if (!TYPES.has(file.type)) return { error: 'wrongType' };
    const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    photoPath = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(photoPath, file, { contentType: file.type, upsert: false });
    if (upErr) {
      console.error('[sighting] photo upload failed', upErr.message);
      return { error: 'generic' };
    }
    photoUrl = supabase.storage.from(BUCKET).getPublicUrl(photoPath).data.publicUrl;
  }

  const { error } = await supabase.from('wildlife_sightings').insert({
    profile_id: user.id,
    species_slug: slug,
    seen_on: seenOn,
    place_name: text(formData, 'place', 120),
    lat,
    lng,
    notes: text(formData, 'notes', 1000),
    photo_path: photoPath,
    photo_url: photoUrl,
  });

  if (error) {
    if (photoPath) await supabase.storage.from(BUCKET).remove([photoPath]);
    console.error('[sighting] insert failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function deleteSighting(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: row } = await supabase
    .from('wildlife_sightings')
    .select('photo_path')
    .eq('id', id)
    .maybeSingle();
  if (!row) return;

  const { error } = await supabase.from('wildlife_sightings').delete().eq('id', id);
  if (error) {
    console.error('[sighting] delete failed', error.message);
    return;
  }
  if (row.photo_path) await supabase.storage.from(BUCKET).remove([row.photo_path]);

  revalidatePath('/', 'layout');
}
