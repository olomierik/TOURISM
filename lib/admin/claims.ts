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
 * Refusals from start_premium_trial() that are ordinary rather than faults.
 *
 * A listing that is not live yet, one that already had its trial, one that is
 * already on a paid plan — none of these is a problem with the approval, and
 * none of them should put a line in the error log every time a claim is waved
 * through. The remaining codes (not_eligible, not_owner, no_plan) mean the
 * transfer or the plan table is wrong, and those are logged.
 */
const EXPECTED_TRIAL_REFUSALS = new Set(['trial_not_live', 'trial_used', 'trial_has_plan']);

/**
 * A date for the approval email. English and UTC, because the email is
 * English and the claim record carries no locale or timezone for the person
 * reading it; "28 January 2027" is unambiguous in a way 01/28/2027 is not.
 */
function longDateUTC(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(iso),
  );
}

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
 *
 * The 60-day trial does start here, in application code, and deliberately not
 * in that trigger. It is allowed to come apart: a listing that is not live
 * yet, or already on a paid plan, cannot take a trial, and neither case is a
 * reason to leave a proved claim unapproved. So the transfer is atomic and the
 * trial is best-effort on top of it, like the audit line and the email.
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

  // The sixty days start the moment the listing becomes theirs.
  //
  // Migration 061 started the trial from a button in the dashboard, on the
  // principle that claiming a listing must not enrol anyone in anything. The
  // owner's decision on 8 November 2026 is that it should: an operator who has
  // just proved they own a business should find Premium already running rather
  // than a free listing and an offer to read. Nothing is charged and no card is
  // taken — at the end the listing drops back to the free plan on its own — so
  // what is being auto-granted is two months of a better listing, not a
  // commitment.
  //
  // It does spend the one trial a listing ever gets, whether or not the owner
  // signs in during those sixty days. That is the cost of the change, and it is
  // the reason the dashboard button stays: a listing that could not take the
  // trial here still has one waiting.
  //
  // The transfer runs in a trigger on the update above, so owner_id is already
  // the claimant by the time this call checks it.
  let trialEndsAt: string | null = null;
  if (decision === 'approved') {
    const { data: endsAt, error: trialError } = await ctx.admin.rpc('start_premium_trial', {
      p_business_id: claim.business_id,
      p_owner_id: claim.claimant_id,
    });
    if (trialError) {
      if (!EXPECTED_TRIAL_REFUSALS.has(trialError.message)) {
        console.error('[trial] auto-start on claim failed', claim.business_id, trialError.message);
      }
    } else if (endsAt) {
      trialEndsAt = String(endsAt);
    }
  }

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
            // Said here rather than left to be discovered: the sixty days are
            // running from today whether or not they sign in this week, and an
            // operator who does not know that loses part of them.
            (trialEndsAt
              ? `Premium is running on your listing for the next 60 days, free — more photos and packages, ` +
                `analytics, and featured placement. It ends on ${longDateUTC(trialEndsAt)}, after which your ` +
                `listing stays live on the free plan. No card is held and nothing is charged at the end.\n\n`
              : '') +
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
