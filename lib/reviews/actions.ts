'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { locales, type Locale } from '@/i18n/routing';

/**
 * Traveler-facing review actions.
 *
 * Whether a review appears immediately or waits for an administrator is a
 * platform setting rather than a constant here, so the policy can change without
 * a deploy. The default is to publish immediately: on a directory with little
 * traffic, reviews that sit in a queue simply never appear, and a business owner
 * chasing a review that "did not work" is a worse problem than the occasional
 * one that needs removing afterwards.
 *
 * Anyone signed in may review. Gating on a distributed enquiry would be stronger
 * evidence of a real interaction, but it also means nobody can review a business
 * they found any other way — including the ones they actually travelled with
 * before this site existed.
 */

export type ReviewState = {
  error?: 'notSignedIn' | 'alreadyReviewed' | 'invalidRating' | 'ownBusiness' | 'generic';
  success?: boolean;
  /** True when the review was held for moderation rather than published. */
  pending?: boolean;
};

export async function submitReview(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'notSignedIn' };

  const businessId = String(formData.get('businessId') ?? '');
  const rating = Number(formData.get('rating') ?? 0);
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  const localeInput = String(formData.get('locale') ?? 'en');
  const locale: Locale = locales.includes(localeInput as Locale) ? (localeInput as Locale) : 'en';

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'invalidRating' };
  }

  // An owner reviewing their own listing is the most obvious way to game a
  // rating, and it costs one query to refuse.
  const { data: business } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .single();

  if (business?.owner_id === user.id) return { error: 'ownBusiness' };

  const admin = createAdminClient();
  const { data: setting } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', 'reviews_require_moderation')
    .maybeSingle();

  const requiresModeration = setting?.value === true;

  const { error } = await supabase.from('reviews').insert({
    business_id: businessId,
    author_id: user.id,
    rating,
    title: title || null,
    body: body || null,
    locale,
    status: requiresModeration ? 'pending' : 'published',
  });

  if (error) {
    // One review per person per business. The unique constraint is the
    // authority; catching it here turns a database error into a sentence.
    if (error.code === '23505') return { error: 'alreadyReviewed' };
    console.error('[reviews] insert failed', error.message);
    return { error: 'generic' };
  }

  // The business page is statically generated, so a new review is invisible
  // until its path is invalidated.
  revalidatePath('/', 'layout');

  return { success: true, pending: requiresModeration };
}

/** Edits a review the caller wrote. RLS restricts this to its author. */
export async function updateOwnReview(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notSignedIn' };

  const id = String(formData.get('id') ?? '');
  const rating = Number(formData.get('rating') ?? 0);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'invalidRating' };
  }

  const { error } = await supabase
    .from('reviews')
    .update({
      rating,
      title: String(formData.get('title') ?? '').trim() || null,
      body: String(formData.get('body') ?? '').trim() || null,
    })
    .eq('id', id)
    .eq('author_id', user.id);

  if (error) {
    console.error('[reviews] update failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/** Removes a review the caller wrote. */
export async function deleteOwnReview(id: string): Promise<ReviewState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notSignedIn' };

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id)
    .eq('author_id', user.id);

  if (error) {
    console.error('[reviews] delete failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * The owner's public reply to a review.
 *
 * One reply per review by design: threading a conversation under a bad review
 * adds moderation work and rarely helps a reader decide anything.
 */
export async function replyToReview(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notSignedIn' };

  const id = String(formData.get('id') ?? '');
  const reply = String(formData.get('reply') ?? '').trim();

  const { error } = await supabase
    .from('reviews')
    .update({
      owner_reply: reply || null,
      owner_replied_at: reply ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) {
    console.error('[reviews] reply failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
