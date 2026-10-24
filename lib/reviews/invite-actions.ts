'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getInvite } from '@/lib/reviews/invite';

export type InvitedReviewState = {
  success?: boolean;
  pending?: boolean;
  error?: 'invalid' | 'invalidRating' | 'tooShort' | 'alreadyReviewed' | 'tooEarly' | 'ownBusiness' | 'generic';
};

/**
 * Saves a review written from an invitation link.
 *
 * The link went to the traveller's email address, so holding it is proof of
 * that address. The review is written under the account for that address:
 * the signed-in one if it matches, an existing one if there is one, otherwise
 * a new account created for it (the traveller can sign in later with Google or
 * "Forgot password"). The enquiry is attached to that account first, which is
 * what the database checks before marking the review verified.
 */
export async function submitInvitedReview(
  token: string,
  _prev: InvitedReviewState,
  formData: FormData,
): Promise<InvitedReviewState> {
  const invite = await getInvite(token);
  if (!invite) return { error: 'invalid' };

  if (invite.travelStart && new Date(invite.travelStart) > new Date()) return { error: 'tooEarly' };

  const rating = Number(formData.get('rating') ?? 0);
  const title = String(formData.get('title') ?? '').trim().slice(0, 120);
  const body = String(formData.get('body') ?? '').trim().slice(0, 4000);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'invalidRating' };
  if (body.length < 20) return { error: 'tooShort' };

  const admin = createAdminClient();
  const email = invite.traveler.email.toLowerCase();

  // Whose review this is.
  let authorId = invite.traveler.id;
  if (!authorId) {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    if (user && user.email?.toLowerCase() === email) authorId = user.id;
  }
  if (!authorId) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle();
    authorId = profile?.id ?? null;
  }
  if (!authorId) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: invite.traveler.name, role: 'traveler', locale: invite.traveler.locale },
    });
    if (error || !created.user) {
      console.error('[reviews] could not create the reviewer account', error?.message);
      return { error: 'generic' };
    }
    authorId = created.user.id;
  }

  if (authorId === invite.business.ownerId) return { error: 'ownBusiness' };

  // The database verifies the review against the enquiry's traveller.
  if (!invite.traveler.id) {
    const { error } = await admin.from('leads').update({ traveler_id: authorId }).eq('id', invite.leadId).is('traveler_id', null);
    if (error) {
      console.error('[reviews] could not attach the enquiry', error.message);
      return { error: 'generic' };
    }
  }

  const { data: setting } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', 'reviews_require_moderation')
    .maybeSingle();
  const requiresModeration = setting?.value === true;

  const { error } = await admin.from('reviews').insert({
    business_id: invite.business.id,
    author_id: authorId,
    lead_id: invite.leadId,
    rating,
    title: title || null,
    body,
    locale: invite.traveler.locale,
    status: requiresModeration ? 'pending' : 'published',
  });
  if (error) {
    if (error.code === '23505') return { error: 'alreadyReviewed' };
    console.error('[reviews] invited insert failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/', 'layout');
  return { success: true, pending: requiresModeration };
}
