'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEmailProvider } from '@/lib/notifications';
import { absoluteUrl } from '@/lib/seo';

export type ClaimReviewState = {
  error?: 'notAllowed' | 'notFound' | 'generic' | 'proofRequired';
  success?: boolean;
};

/**
 * An approval with no proof behind it has to be written down.
 *
 * `verified_at` is set only by consumeVerificationFor() in lib/claims, after
 * the claimant read a one-time code sent to the contact the listing was
 * published with — the address KATO or the Uganda Tourism Board has on file,
 * not one the claimant typed. A claim without it was filed on an evidence
 * paragraph, and a paragraph authenticates nobody: anybody who can read a
 * listing can write "I own this, here is my licence number".
 *
 * Nineteen of the twenty-one claims approved to date carried a code. Two did
 * not, and nothing in the queue told the reviewer which two — so this is not a
 * hypothetical hole being closed in advance.
 *
 * The override is left open rather than removed. An operator whose published
 * address is a dead agency mailbox is a real case, and an admin who has spoken
 * to them on the telephone knows something the database cannot. What changes is
 * that the reason is required, stored on the claim and written to the audit log,
 * so an ownership transfer made on someone's word can be found later.
 */
const OVERRIDE_REASON_MIN = 20;

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
    .select(
      'id, business_id, claimant_id, contact_email, contact_name, status, verified_at, verification_method, verified_contact',
    )
    .eq('id', claimId)
    .maybeSingle();

  if (!claim) return { error: 'notFound' };
  if (claim.status !== 'pending') return { error: 'notFound' };

  // Rejecting an unproved claim needs no ceremony — that is the expected
  // outcome. Approving one hands a stranger a business.
  const proved = Boolean(claim.verified_at);
  const reason = note?.trim() ?? '';
  if (decision === 'approved' && !proved && reason.length < OVERRIDE_REASON_MIN) {
    return { error: 'proofRequired' };
  }

  const { error } = await ctx.supabase
    .from('business_claims')
    .update({
      status: decision,
      reviewed_by: ctx.userId,
      reviewed_at: new Date().toISOString(),
      review_note: reason || null,
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
      after: {
        business_id: claim.business_id,
        claimant_id: claim.claimant_id,
        note: reason || null,
        // Recorded on every decision, not only the overrides: an audit trail
        // that says nothing about the proved cases cannot be used to tell the
        // two apart afterwards.
        proof: proved
          ? { method: claim.verification_method, contact: claim.verified_contact, at: claim.verified_at }
          : null,
        overrode_missing_proof: decision === 'approved' && !proved,
      },
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
  // The overview counts these and now names them too, so it goes stale on the
  // same decision the queue does.
  revalidatePath('/admin');
  if (business?.slug) revalidatePath(`/business/${business.slug}`);

  return { success: true };
}
