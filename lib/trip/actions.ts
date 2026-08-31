'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { isStyle, type Style } from '@/lib/trip/cost';
import { MAX_NIGHTS, MAX_STOPS, MAX_TRAVELLERS } from '@/lib/trip/url';

export type SaveTripState = {
  error?: 'signedOut' | 'empty' | 'tooMany' | 'generic';
  savedId?: string;
};

/**
 * Saves a trip built in the estimator.
 *
 * Everything arrives from a form on a page anyone can reach, so nothing here
 * trusts its input: the style is narrowed against the same guard the URL parser
 * uses, counts are clamped, and slugs are resolved against the database rather
 * than stored as given. RLS decides ownership — profile_id is set from the
 * session, never from the payload, so a forged field cannot write into somebody
 * else's account.
 *
 * A trip with no stops is refused rather than saved as an empty row. "You have
 * one saved trip" that opens on nothing is a bug report waiting to happen.
 */
export async function saveTrip(
  _prev: SaveTripState,
  formData: FormData,
): Promise<SaveTripState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'signedOut' };

  const styleRaw = String(formData.get('style') ?? '');
  const style: Style = isStyle(styleRaw) ? styleRaw : 'midrange';

  const travellers = Math.min(
    MAX_TRAVELLERS,
    Math.max(1, Number.parseInt(String(formData.get('travellers') ?? ''), 10) || 2),
  );

  const nameRaw = String(formData.get('name') ?? '').trim();
  const name = nameRaw === '' ? null : nameRaw.slice(0, 80);

  // `serengeti:4,ngorongoro:2` — the same encoding the share link uses, so
  // there is one format for a trip rather than two that can disagree.
  const stops: Array<{ slug: string; nights: number }> = [];
  const seen = new Set<string>();
  for (const part of String(formData.get('stops') ?? '').split(',')) {
    if (stops.length >= MAX_STOPS) break;
    const [slug, nightsRaw] = part.split(':');
    if (!slug || !/^[a-z0-9-]{1,80}$/.test(slug) || seen.has(slug)) continue;
    const nights = Number.parseInt(nightsRaw ?? '', 10);
    if (!Number.isFinite(nights) || nights < 1 || nights > MAX_NIGHTS) continue;
    seen.add(slug);
    stops.push({ slug, nights });
  }
  if (stops.length === 0) return { error: 'empty' };

  // Slugs are per-locale, so a German visitor saving from /de/reisekosten sends
  // German slugs. Resolving across every locale means the trip is stored as
  // destination ids and reads back correctly in any language.
  const { data: rows, error: lookupError } = await supabase
    .from('destination_translations')
    .select('slug, destination_id')
    .in('slug', stops.map((s) => s.slug));

  if (lookupError) return { error: 'generic' };

  const idBySlug = new Map((rows ?? []).map((r) => [r.slug, r.destination_id]));
  const resolved = stops
    .map((s, i) => ({ id: idBySlug.get(s.slug), nights: s.nights, position: i }))
    .filter((s): s is { id: string; nights: number; position: number } => Boolean(s.id));

  if (resolved.length === 0) return { error: 'empty' };

  // Twenty is arbitrary but a limit is not: without one a script can fill a
  // table that has no other bound on it.
  const { count } = await supabase
    .from('saved_trips')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', user.id);
  if ((count ?? 0) >= 20) return { error: 'tooMany' };

  // One transaction, through save_trip(). Two inserts over PostgREST are two
  // transactions with a window between them where a trip exists with nothing
  // in it — and a compensating delete here would only be a promise this caller
  // makes, while the table is reachable by anyone with the publishable key.
  // The function runs as the caller, so RLS still decides ownership and the
  // profile comes from the session rather than from anything sent here.
  const { data: tripId, error } = await supabase.rpc('save_trip', {
    p_name: name ?? '',
    p_style: style,
    p_travellers: travellers,
    p_stops: resolved.map((s) => ({ destination_id: s.id, nights: s.nights })),
  });

  if (error || !tripId) return { error: 'generic' };

  revalidatePath('/account/trips');
  return { savedId: tripId };
}

/** Removes a saved trip. RLS decides whose it is; the stops cascade. */
export async function deleteTrip(tripId: string): Promise<SaveTripState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'signedOut' };

  const { error } = await supabase.from('saved_trips').delete().eq('id', tripId);
  if (error) return { error: 'generic' };

  revalidatePath('/account/trips');
  return {};
}
