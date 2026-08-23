'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEmailProvider } from '@/lib/notifications';
import type { Enums, Json } from '@/lib/supabase/database.types';

export type AdminState = { error?: 'notAllowed' | 'generic'; success?: boolean };

/**
 * Confirms the caller is an admin and returns both clients.
 *
 * The privileged work runs on the cookie-bound client so RLS is the thing
 * authorizing it — the admin policies already say "admins may do this", and
 * re-deriving that in application code would give two sources of truth. The
 * service client is returned alongside purely for the audit write, which must
 * not be skippable by the actor it is recording.
 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return null;

  return { supabase, admin: createAdminClient(), userId: user.id };
}

/**
 * Appends to the audit log.
 *
 * Written with the service client rather than the caller's, because audit_logs
 * deliberately has no INSERT policy: nothing reachable from a browser should be
 * able to write history, and an admin should not be able to act without leaving
 * a trace. A logging failure is reported but never blocks the action — losing
 * the action would be worse than losing the record of it.
 */
async function audit(
  admin: ReturnType<typeof createAdminClient>,
  actorId: string,
  entry: {
    action: string;
    entityType: string;
    entityId: string;
    before?: Json;
    after?: Json;
  },
) {
  try {
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim();
    await admin.from('audit_logs').insert({
      actor_id: actorId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      before: entry.before ?? null,
      after: entry.after ?? null,
      ip_address: ip || null,
    });
  } catch (err) {
    console.error('[audit] write failed', entry.action, entry.entityId, err);
  }
}

function revalidateAdmin() {
  revalidatePath('/admin');
  revalidatePath('/admin/businesses');
}

/** Approve, reject or suspend a business listing. */
export async function setBusinessStatus(
  businessId: string,
  status: Enums<'business_status'>,
  note?: string,
): Promise<AdminState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const { data: before } = await ctx.supabase
    .from('businesses')
    .select('status, name, owner_id')
    .eq('id', businessId)
    .single();

  const { error } = await ctx.supabase
    .from('businesses')
    .update({ status })
    .eq('id', businessId);

  if (error) {
    console.error('[admin] status change failed', error.message);
    return { error: 'generic' };
  }

  await audit(ctx.admin, ctx.userId, {
    action: `business.${status}`,
    entityType: 'business',
    entityId: businessId,
    before: { status: before?.status ?? null } as Json,
    after: { status, note: note ?? null } as Json,
  });

  // Tell the owner. A rejection without a reason is the fastest way to lose a
  // listing, so the note travels with it.
  if (before?.owner_id && (status === 'approved' || status === 'rejected')) {
    await notifyOwner(ctx.admin, before.owner_id, businessId, status, note);
  }

  revalidateAdmin();
  // The public directory is statically generated, so an approval has to
  // invalidate it or the listing stays invisible until the next deploy.
  revalidatePath('/', 'layout');
  return { success: true };
}

/** Grant or withdraw the verified badge. */
export async function setBusinessVerified(
  businessId: string,
  verified: boolean,
): Promise<AdminState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const { error } = await ctx.supabase
    .from('businesses')
    .update({ is_verified: verified, verified_by: verified ? ctx.userId : null })
    .eq('id', businessId);

  if (error) {
    console.error('[admin] verification change failed', error.message);
    return { error: 'generic' };
  }

  await audit(ctx.admin, ctx.userId, {
    action: verified ? 'business.verified' : 'business.unverified',
    entityType: 'business',
    entityId: businessId,
    after: { is_verified: verified } as Json,
  });

  revalidateAdmin();
  revalidatePath('/', 'layout');
  return { success: true };
}

/** Publish or reject a review. */
export async function moderateReview(
  reviewId: string,
  status: Enums<'review_status'>,
  note?: string,
): Promise<AdminState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const { data: before } = await ctx.supabase
    .from('reviews')
    .select('status')
    .eq('id', reviewId)
    .single();

  const { error } = await ctx.supabase
    .from('reviews')
    .update({
      status,
      moderated_by: ctx.userId,
      moderated_at: new Date().toISOString(),
      moderation_note: note ?? null,
    })
    .eq('id', reviewId);

  if (error) {
    console.error('[admin] review moderation failed', error.message);
    return { error: 'generic' };
  }

  await audit(ctx.admin, ctx.userId, {
    action: `review.${status}`,
    entityType: 'review',
    entityId: reviewId,
    before: { status: before?.status ?? null } as Json,
    after: { status, note: note ?? null } as Json,
  });

  revalidatePath('/admin/reviews');
  revalidatePath('/', 'layout');
  return { success: true };
}

/** Publish, unpublish or archive a travel guide. */
export async function setGuideStatus(
  guideId: string,
  status: Enums<'content_status'>,
): Promise<AdminState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const { error } = await ctx.supabase
    .from('guides')
    .update({ status })
    .eq('id', guideId);

  if (error) {
    console.error('[admin] guide status change failed', error.message);
    return { error: 'generic' };
  }

  await audit(ctx.admin, ctx.userId, {
    action: `guide.${status}`,
    entityType: 'guide',
    entityId: guideId,
    after: { status } as Json,
  });

  revalidatePath('/admin/guides');
  revalidatePath('/', 'layout');
  return { success: true };
}

/** Change a platform setting, such as business auto-approval. */
export async function setPlatformSetting(
  key: string,
  value: Json,
): Promise<AdminState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const { data: before } = await ctx.supabase
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .single();

  const { error } = await ctx.supabase
    .from('platform_settings')
    .update({ value, updated_by: ctx.userId, updated_at: new Date().toISOString() })
    .eq('key', key);

  if (error) {
    console.error('[admin] setting update failed', error.message);
    return { error: 'generic' };
  }

  await audit(ctx.admin, ctx.userId, {
    action: 'settings.updated',
    entityType: 'platform_setting',
    entityId: key,
    before: (before?.value ?? null) as Json,
    after: value,
  });

  revalidatePath('/admin/settings');
  return { success: true };
}

async function notifyOwner(
  admin: ReturnType<typeof createAdminClient>,
  ownerId: string,
  businessId: string,
  status: 'approved' | 'rejected',
  note?: string,
) {
  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', ownerId)
      .single();

    await admin.from('notifications').insert({
      profile_id: ownerId,
      kind: status === 'approved' ? 'business_approved' : 'business_rejected',
      business_id: businessId,
      payload: { note: note ?? null } as Json,
    });

    if (profile?.email) {
      await getEmailProvider().send({
        to: profile.email,
        subject:
          status === 'approved'
            ? 'Your Explore Tanzania listing is live'
            : 'Your Explore Tanzania listing needs changes',
        text:
          status === 'approved'
            ? `Hello${profile.full_name ? ` ${profile.full_name}` : ''},\n\nYour listing has been approved and is now visible to travelers.\n\n— Explore Tanzania`
            : `Hello${profile.full_name ? ` ${profile.full_name}` : ''},\n\nWe could not approve your listing as it stands.${note ? `\n\n${note}` : ''}\n\nUpdate it in your dashboard and submit it again.\n\n— Explore Tanzania`,
      });
    }
  } catch (err) {
    console.error('[admin] owner notification failed', businessId, err);
  }
}
