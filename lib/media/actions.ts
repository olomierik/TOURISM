'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import type { Enums } from '@/lib/supabase/database.types';

/**
 * Server actions for image upload and management.
 *
 * The upload itself happens in the browser, straight to Supabase Storage, and
 * only the resulting row is written here. That is deliberate: routing file bytes
 * through a server action means the whole file is buffered in the function's
 * memory and counts against the request body limit, which a 10 MB photo from a
 * modern phone camera will hit. The browser talks to storage directly under the
 * same RLS the server would have applied — the storage policies authorize by
 * folder ownership and role, not by which process made the call.
 *
 * What server-side code is still responsible for is the media row: the caption,
 * the ordering, and the quota. Those are database concerns and are enforced
 * there.
 */

export type MediaState = {
  error?: 'notAllowed' | 'limitReached' | 'invalidFile' | 'generic';
  /** On limitReached, the plan's allowance, so the UI can say what the cap is. */
  limit?: number;
  success?: boolean;
};

export type MediaOwner =
  | { businessId: string }
  | { destinationId: string }
  | { guideId: string }
  | { packageId: string };

type OwnerKey = 'businessId' | 'destinationId' | 'guideId' | 'packageId';
type OwnerColumn = 'business_id' | 'destination_id' | 'guide_id' | 'package_id';

/**
 * Column and bucket for each kind of owner.
 *
 * Written as one table rather than two lookups so a new owner type cannot be
 * added to one and forgotten in the other.
 */
const OWNERS: Record<OwnerKey, { column: OwnerColumn; bucket: string }> = {
  businessId: { column: 'business_id', bucket: 'business-media' },
  destinationId: { column: 'destination_id', bucket: 'destination-media' },
  guideId: { column: 'guide_id', bucket: 'guide-covers' },
  packageId: { column: 'package_id', bucket: 'business-media' },
};

/** Column name and bucket for an owner reference. */
function resolveOwner(owner: MediaOwner) {
  const [key, value] = Object.entries(owner)[0] as [OwnerKey, string];
  return { ...OWNERS[key], id: value };
}

/**
 * Where an upload must be written for the storage policies to accept it.
 *
 * The path's first segment is load-bearing: business-media policies check it
 * against ownership, so a client that invents its own path is rejected by
 * storage rather than trusted. Returning it from the server keeps the convention
 * in one place instead of duplicated into every upload component.
 */
export async function prepareUpload(
  owner: MediaOwner,
  fileName: string,
): Promise<{ bucket: string; path: string } | { error: MediaState['error'] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notAllowed' };

  const { bucket, id } = resolveOwner(owner);

  // Strip anything that could climb out of the folder or confuse a CDN, and
  // keep the extension so storage serves the right content type.
  const ext = (fileName.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext) ? ext : 'jpg';

  return { bucket, path: `${id}/${crypto.randomUUID()}.${safeExt}` };
}

/**
 * Records an uploaded file as a media row.
 *
 * Called after the browser has put the bytes in storage. If this fails the file
 * is orphaned in the bucket, so the failure path removes it rather than leaving
 * bytes nobody can see or delete through the UI.
 */
export async function attachMedia(
  owner: MediaOwner,
  file: {
    bucket: string;
    path: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    caption?: string;
    altText?: string;
  },
  kind: Enums<'media_kind'> = 'gallery',
): Promise<MediaState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notAllowed' };

  const { column, id } = resolveOwner(owner);

  const { data: publicUrl } = supabase.storage.from(file.bucket).getPublicUrl(file.path);

  // Append: put a new image after everything already there.
  const { data: last } = await supabase
    .from('media')
    .select('sort_order')
    .eq(column, id)
    .eq('kind', kind)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  // The four owner columns are written explicitly rather than through a computed
  // key. A computed key widens the object to an index signature, which the
  // generated row type rejects — and spelling them out means adding a fifth
  // owner kind is a compile error here rather than a silently ignored column.
  const { error } = await supabase.from('media').insert({
    business_id: column === 'business_id' ? id : null,
    destination_id: column === 'destination_id' ? id : null,
    guide_id: column === 'guide_id' ? id : null,
    package_id: column === 'package_id' ? id : null,
    kind,
    bucket: file.bucket,
    storage_path: file.path,
    public_url: publicUrl.publicUrl,
    file_name: file.fileName,
    mime_type: file.mimeType,
    size_bytes: file.sizeBytes,
    caption: file.caption?.trim() || null,
    alt_text: file.altText?.trim() || file.caption?.trim() || null,
    uploaded_by: user.id,
    sort_order: (last?.sort_order ?? -1) + 1,
  });

  if (error) {
    // Remove the orphan before reporting, or the bucket accumulates bytes that
    // no row references and no screen can reach.
    await supabase.storage.from(file.bucket).remove([file.path]);

    // The quota trigger raises with this message and carries the limit in the
    // hint, so the UI can name the number rather than saying "too many".
    if (error.message.includes('gallery_limit_reached')) {
      const limit = Number((error as { hint?: string }).hint);
      return { error: 'limitReached', limit: Number.isFinite(limit) ? limit : undefined };
    }
    console.error('[media] attach failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/** Edit the visible caption and the accessibility text of an existing image. */
export async function updateMedia(
  mediaId: string,
  fields: { caption?: string; altText?: string },
): Promise<MediaState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('media')
    .update({
      caption: fields.caption?.trim() || null,
      alt_text: fields.altText?.trim() || fields.caption?.trim() || null,
    })
    .eq('id', mediaId);

  if (error) {
    console.error('[media] update failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Deletes an image, both the row and the stored bytes.
 *
 * Row first: RLS decides whether this caller may touch it, and doing the
 * permission-checked operation first means an unauthorized caller never reaches
 * the storage call. The file is removed second — if that fails the row is
 * already gone, which leaves an orphaned object rather than a broken image on a
 * live page, the better of the two failures.
 */
export async function deleteMedia(mediaId: string): Promise<MediaState> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from('media')
    .select('bucket, storage_path')
    .eq('id', mediaId)
    .single();

  const { error } = await supabase.from('media').delete().eq('id', mediaId);

  if (error) {
    console.error('[media] delete failed', error.message);
    return { error: 'generic' };
  }

  if (row) {
    const { error: rmErr } = await supabase.storage.from(row.bucket).remove([row.storage_path]);
    if (rmErr) console.error('[media] orphaned object', row.bucket, row.storage_path, rmErr.message);
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/** Moves an image one place earlier or later in its gallery. */
export async function reorderMedia(
  mediaId: string,
  direction: 'up' | 'down',
): Promise<MediaState> {
  const supabase = await createClient();

  const { data: current } = await supabase
    .from('media')
    .select('id, sort_order, kind, business_id, destination_id, guide_id, package_id')
    .eq('id', mediaId)
    .single();

  if (!current) return { error: 'generic' };

  const column = current.business_id
    ? 'business_id'
    : current.destination_id
      ? 'destination_id'
      : current.guide_id
        ? 'guide_id'
        : 'package_id';
  const ownerId = current[column as keyof typeof current] as string;

  // The neighbour in the chosen direction, whatever its sort_order happens to
  // be. Comparing against the neighbour rather than against index ± 1 keeps this
  // correct even when orders are sparse or have collided.
  const { data: neighbour } = await supabase
    .from('media')
    .select('id, sort_order')
    .eq(column, ownerId)
    .eq('kind', current.kind)
    .neq('id', mediaId)
    [direction === 'up' ? 'lt' : 'gt']('sort_order', current.sort_order)
    .order('sort_order', { ascending: direction !== 'up' })
    .limit(1)
    .maybeSingle();

  if (!neighbour) return { success: true }; // already at the end

  // Two updates rather than an upsert: upsert would require every not-null
  // column of the row, so it would mean reading and rewriting the whole record
  // to move one image one place. sort_order carries no unique constraint, so the
  // worst case if the second update fails is two images sharing an order and
  // sorting arbitrarily between themselves — untidy, not corrupt.
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from('media').update({ sort_order: neighbour.sort_order }).eq('id', current.id),
    supabase.from('media').update({ sort_order: current.sort_order }).eq('id', neighbour.id),
  ]);

  if (e1 || e2) {
    console.error('[media] reorder failed', e1?.message ?? e2?.message);
    return { error: 'generic' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * How many gallery images this business may still add.
 *
 * Used to decide whether the dashboard shows the upload control or the upgrade
 * prompt. The database enforces the same limit independently — this is for
 * telling the user where they stand, not for security.
 */
export async function galleryAllowance(
  businessId: string,
): Promise<{ used: number; limit: number | null }> {
  const supabase = await createClient();

  const [{ count }, { data: limit }] = await Promise.all([
    supabase
      .from('media')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('kind', 'gallery'),
    supabase.rpc('gallery_limit_for', { p_business_id: businessId }),
  ]);

  return { used: count ?? 0, limit: typeof limit === 'number' ? limit : null };
}
