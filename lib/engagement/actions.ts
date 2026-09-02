'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Likes, comments and travellers' photographs.
 *
 * The permission ladder is deliberate and matches migration 055: a like is one
 * tap open to anybody, a comment from a signed-in author publishes at once
 * while an anonymous one waits for a human, and a photograph always requires
 * an account and always waits. The less the platform can undo, the more it
 * asks first.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LikeState = { liked: boolean; count: number };

/**
 * Adds or removes a like, and returns the state the button should show.
 *
 * The visitor id is generated and kept by the browser. It is not proof of
 * anything and is not treated as any: it deduplicates, nothing more. Anything
 * that mattered would be decided by the session, which the server reads for
 * itself below.
 */
export async function toggleLike(businessId: string, visitorId: string): Promise<LikeState> {
  if (!UUID.test(businessId) || !UUID.test(visitorId)) return { liked: false, count: 0 };

  const admin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A signed-in person is matched by account first, so liking from a second
  // browser toggles the like they already have rather than adding another.
  const existing = user
    ? await admin
        .from('business_likes')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', user.id)
        .maybeSingle()
    : await admin
        .from('business_likes')
        .select('id')
        .eq('business_id', businessId)
        .eq('visitor_id', visitorId)
        .maybeSingle();

  if (existing.data) {
    await admin.from('business_likes').delete().eq('id', existing.data.id);
  } else {
    const { error } = await admin
      .from('business_likes')
      .insert({ business_id: businessId, visitor_id: visitorId, user_id: user?.id ?? null });
    // A duplicate means two taps raced. The state below is read fresh either
    // way, so the button still ends up showing the truth.
    if (error && error.code !== '23505') {
      console.error('[like] insert failed', error.message);
    }
  }

  const { data: business } = await admin
    .from('businesses')
    .select('like_count')
    .eq('id', businessId)
    .maybeSingle();

  return { liked: !existing.data, count: business?.like_count ?? 0 };
}

export type CommentState = {
  error?: 'nameRequired' | 'bodyTooShort' | 'bodyTooLong' | 'rateLimited' | 'generic';
  /** Published straight away, or waiting for a human. */
  status?: 'published' | 'pending';
};

export async function postComment(
  _prev: CommentState,
  formData: FormData,
): Promise<CommentState> {
  const businessId = String(formData.get('businessId') ?? '');
  if (!UUID.test(businessId)) return { error: 'generic' };

  // Same honeypot lesson as the quote form: a field named `company` is what
  // Chrome autofills as an organisation, and every real submission tripped it.
  if (String(formData.get('et_hp_ref') ?? '').trim()) {
    console.warn('[comment] honeypot tripped — discarded');
    return { status: 'pending' };
  }

  const body = String(formData.get('body') ?? '').trim();
  if (body.length < 2) return { error: 'bodyTooShort' };
  if (body.length > 2000) return { error: 'bodyTooLong' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  let authorName = String(formData.get('authorName') ?? '').trim();
  if (user) {
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();
    authorName = profile?.full_name?.trim() || authorName || user.email?.split('@')[0] || 'Traveller';
  }
  if (!authorName) return { error: 'nameRequired' };
  if (authorName.length > 80) authorName = authorName.slice(0, 80);

  // A signed-in author is accountable and publishes at once. An anonymous one
  // is text from a stranger on somebody else's business page, which is a spam
  // surface, so it waits for a human. This is the whole difference an account
  // makes here, and it is worth saying so on the form.
  const status = user ? 'published' : 'pending';

  // Cheap rate limit on the same listing, which is where flooding would show.
  const since = new Date(new Date().getTime() - 10 * 60 * 1000).toISOString();
  const { count: recent } = await admin
    .from('business_comments')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('author_name', authorName)
    .gte('created_at', since);

  if ((recent ?? 0) >= 3) return { error: 'rateLimited' };

  const locale = await getLocale();
  const { error } = await admin.from('business_comments').insert({
    business_id: businessId,
    author_id: user?.id ?? null,
    author_name: authorName,
    body,
    is_recommendation: formData.get('recommend') === 'on',
    locale,
    status,
  });

  if (error) {
    console.error('[comment] insert failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/', 'layout');
  return { status };
}

export type PhotoState = {
  error?: 'notSignedIn' | 'noFile' | 'tooLarge' | 'wrongType' | 'generic';
  success?: boolean;
};

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

/**
 * A traveller's own photograph of a business.
 *
 * Requires an account and is never visible until an admin approves it. A public
 * site that accepts images from strangers without both is a host for whatever
 * anybody uploads, and deleting it afterwards does not undo the hours it was
 * live. That is a different judgement from the one made about comments, and it
 * is made differently because the two are not comparable: text can be read at a
 * glance and an image cannot be unseen.
 */
export async function uploadTravelerPhoto(
  _prev: PhotoState,
  formData: FormData,
): Promise<PhotoState> {
  const businessId = String(formData.get('businessId') ?? '');
  if (!UUID.test(businessId)) return { error: 'generic' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notSignedIn' };

  const file = formData.get('photo');
  if (!(file instanceof File) || file.size === 0) return { error: 'noFile' };
  if (file.size > MAX_BYTES) return { error: 'tooLarge' };
  if (!TYPES.has(file.type)) return { error: 'wrongType' };

  // businessId/userId/filename — the second segment is what the storage policy
  // checks, so one traveller cannot overwrite another's file even inside the
  // same listing's folder.
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${businessId}/${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('traveler-photos')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (upErr) {
    console.error('[photo] upload failed', upErr.message);
    return { error: 'generic' };
  }

  const { data: publicUrl } = supabase.storage.from('traveler-photos').getPublicUrl(path);

  const { error } = await supabase.from('traveler_photos').insert({
    business_id: businessId,
    uploaded_by: user.id,
    bucket: 'traveler-photos',
    storage_path: path,
    public_url: publicUrl.publicUrl,
    caption: String(formData.get('caption') ?? '').trim() || null,
    status: 'pending',
  });

  if (error) {
    // Remove the orphan rather than leave bytes nothing references.
    await supabase.storage.from('traveler-photos').remove([path]);
    console.error('[photo] row insert failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
