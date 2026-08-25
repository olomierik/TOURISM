'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEmailProvider } from '@/lib/notifications';
import { absoluteUrl } from '@/lib/seo';

export type ClaimReviewState = {
  error?: 'notAllowed' | 'notFound' | 'generic';
  success?: boolean;
};

/**
 * Deciding a listing claim.
 *
 * Approving one transfers a business to a person: its contact details, its
 * enquiries, its position in lead routing. It is the most consequential button
 * in the admin panel, which is why the rule is enforced three deep — this
 * function checks the role, RLS restricts the update to admins, and a database
 * trigger raises if a non-admin moves a claim to approved or rejected. Any one
 * of the three could be loosened by a later change; all three at once is
 * unlikely to happen by accident.
 *
 * The ownership transfer itself is a trigger, not code here. Two writes that
 * must not come apart should not be two statements from the application.
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

export async function decideClaim(
  claimId: string,
  decision: 'approved' | 'rejected',
  note?: string,
): Promise<ClaimReviewState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const { data: claim } = await ctx.supabase
    .from('business_claims')
    .select('id, business_id, claimant_id, contact_email, contact_name, status')
    .eq('id', claimId)
    .maybeSingle();

  if (!claim) return { error: 'notFound' };
  if (claim.status !== 'pending') return { error: 'notFound' };

  const { error } = await ctx.supabase
    .from('business_claims')
    .update({
      status: decision,
      reviewed_by: ctx.userId,
      reviewed_at: new Date().toISOString(),
      review_note: note?.trim() || null,
    })
    .eq('id', claimId)
    .eq('status', 'pending');

  if (error) {
    console.error('decideClaim:', error.message);
    return { error: 'generic' };
  }

  const { data: business } = await ctx.admin
    .from('businesses')
    .select('slug, name')
    .eq('id', claim.business_id)
    .maybeSingle();

  try {
    await ctx.admin.from('audit_logs').insert({
      actor_id: ctx.userId,
      action: decision === 'approved' ? 'claim.approve' : 'claim.reject',
      entity_type: 'business_claim',
      entity_id: claimId,
      after: { business_id: claim.business_id, claimant_id: claim.claimant_id, note: note ?? null },
    });
  } catch (err) {
    console.error('[audit] claim decision write failed', err);
  }

  // The claimant is waiting on this. Silence after handing over evidence is the
  // fastest way to lose an operator who was willing to list.
  try {
    const email = getEmailProvider();
    await email.send({
      to: claim.contact_email,
      subject:
        decision === 'approved'
          ? `You now manage ${business?.name ?? 'your listing'} on Explore Tanzania`
          : `About your claim for ${business?.name ?? 'a listing'}`,
      text:
        decision === 'approved'
          ? `Hello ${claim.contact_name},\n\n` +
            `Your claim has been approved and the listing is now yours to manage.\n\n` +
            `Sign in and open your dashboard: ${absoluteUrl('/dashboard')}\n\n` +
            `Your listing: ${absoluteUrl(`/business/${business?.slug ?? ''}`)}\n\n` +
            `— Explore Tanzania`
          : `Hello ${claim.contact_name},\n\n` +
            `We could not approve your claim as it stands.${note ? `\n\n${note}` : ''}\n\n` +
            `If you can supply further evidence, reply to this message and we will look again.\n\n` +
            `— Explore Tanzania`,
    });
  } catch (err) {
    console.error('claim decision email failed:', err);
  }

  revalidatePath('/admin/claims');
  if (business?.slug) revalidatePath(`/business/${business.slug}`);

  return { success: true };
}
