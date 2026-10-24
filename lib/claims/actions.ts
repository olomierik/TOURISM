'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEmailProvider } from '@/lib/notifications';
import { absoluteUrl } from '@/lib/seo';
import { consumeVerificationFor } from './verification';
import { lookupInvite } from './invites';
import { hashInviteToken, isInviteToken } from './invite-token';

export type ClaimErrorKey =
  | 'notSignedIn'
  | 'nameRequired'
  | 'emailRequired'
  | 'emailInvalid'
  | 'evidenceRequired'
  | 'alreadyClaimed'
  | 'alreadyPending'
  | 'notFound'
  | 'generic';

export type ClaimState = { error?: ClaimErrorKey; submitted?: boolean };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();

/**
 * Files a claim on an unclaimed listing.
 *
 * Deliberately requires a session, unlike the quote form. A quote is a lead and
 * friction loses it; a claim ends with someone being handed control of a
 * business listing, and there has to be an account to hand it to. It also gives
 * the reviewer something to check beyond a form submission.
 *
 * Nothing here decides anything. The row lands as `pending`, and the database
 * refuses to let a non-admin move it to `approved` — enforced by a trigger as
 * well as by RLS, because the failure is silent and the blast radius is every
 * listing on the site.
 */
export async function submitClaim(
  _prev: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  // Honeypot. The field used to be named `company`, which Chrome autofills as an
  // organisation regardless of autocomplete="off" — so a real person with
  // autofill enabled tripped the trap, saw "Claim received", and had nothing
  // created. The name below matches no autofill heuristic, and a trip is logged:
  // a honeypot that discards real submissions in silence is worse than none.
  if (str(formData, 'et_hp_ref')) {
    console.warn('[claim] honeypot tripped — submission discarded');
    return { submitted: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notSignedIn' };

  const businessId = str(formData, 'businessId');
  const contactName = str(formData, 'contactName');
  const contactEmail = str(formData, 'contactEmail');
  const contactPhone = str(formData, 'contactPhone') || null;
  const evidence = str(formData, 'evidence');

  if (!contactName) return { error: 'nameRequired' };
  if (!contactEmail) return { error: 'emailRequired' };
  if (!EMAIL_RE.test(contactEmail)) return { error: 'emailInvalid' };
  // The reviewer has to check this against a licensing registry. A claim with no
  // evidence is not a claim, and accepting one trains the queue to be ignored.
  //
  // Unless the mailbox on the listing already answered: someone who opened the
  // address KATO publishes for this business has demonstrated more than any
  // paragraph could, and asking them to write one as well is friction for its
  // own sake.
  const alreadyProved = await consumeVerificationFor(businessId, user.id);
  if (!alreadyProved && evidence.length < 20) return { error: 'evidenceRequired' };

  const { data: business } = await supabase
    .from('businesses')
    .select('id, slug, name, owner_id, status')
    .eq('id', businessId)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .maybeSingle();

  if (!business) return { error: 'notFound' };
  if (business.owner_id) return { error: 'alreadyClaimed' };

  const { data: existing } = await supabase
    .from('business_claims')
    .select('id')
    .eq('business_id', businessId)
    .eq('claimant_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) return { error: 'alreadyPending' };

  // Someone may have proved control of the listing's published mailbox before
  // filling this in — people do not work through a form in the order it was
  // written. Carry that proof onto the claim rather than making them do it
  // again. The guard trigger (068) refuses these columns from a signed-in
  // claimant on insert as well as update, so the row is written with the
  // service role, after the checks above stood in for the insert policy.
  const proof = alreadyProved;

  const { error } = await createAdminClient().from('business_claims').insert({
    business_id: businessId,
    claimant_id: user.id,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    evidence,
    ...(proof
      ? {
          verified_at: proof.verifiedAt,
          verification_method: proof.method,
          verified_contact: proof.contact,
        }
      : {}),
  });

  if (error) {
    // The partial unique index is the authority on "already pending"; the check
    // above is a nicer message, not the guarantee.
    if (error.code === '23505') return { error: 'alreadyPending' };
    console.error('submitClaim:', error.message);
    return { error: 'generic' };
  }

  // Told to arrive, not asked. A claim sitting unreviewed for a week is the
  // difference between an operator who lists and one who gives up.
  await notifyAdminsOfClaim(business.name, business.slug, contactName).catch((err) =>
    console.error('claim notification failed:', err),
  );

  const locale = await getLocale();
  revalidatePath(`/${locale}/business/${business.slug}`);

  return { submitted: true };
}

export type InviteClaimState = {
  error?: 'notSignedIn' | 'inviteUsed' | 'inviteExpired' | 'inviteInvalid' | 'alreadyClaimed' | 'notFound' | 'generic';
  submitted?: boolean;
};

/**
 * Files a verified claim from a single-use claim link (claim_invites, 067).
 *
 * The link went only to the listing's published mailbox, so opening it signed
 * in proves what the emailed code proves, without the code. The token is spent
 * in the same statement that checks it, so a second tab or a forwarded copy
 * finds it gone. An admin still approves the claim, as with every claim.
 */
export async function redeemClaimInvite(
  businessId: string,
  token: string,
): Promise<InviteClaimState> {
  if (!isInviteToken(token)) return { error: 'inviteInvalid' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notSignedIn' };

  const admin = createAdminClient();
  const { data: business } = await admin
    .from('businesses')
    .select('id, slug, name, owner_id')
    .eq('id', businessId)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .maybeSingle();
  if (!business) return { error: 'notFound' };
  if (business.owner_id) return { error: 'alreadyClaimed' };

  const now = new Date().toISOString();
  const { data: spent } = await admin
    .from('claim_invites')
    .update({ used_at: now, used_by: user.id })
    .eq('token_hash', hashInviteToken(token))
    .eq('business_id', businessId)
    .is('used_at', null)
    .gt('expires_at', now)
    .select('email')
    .maybeSingle();

  if (!spent) {
    const invite = await lookupInvite(businessId, token);
    // A double click, or the same person back on the page: already done.
    if (invite.status === 'used' && invite.usedBy === user.id) return { submitted: true };
    if (invite.status === 'used') return { error: 'inviteUsed' };
    if (invite.status === 'expired') return { error: 'inviteExpired' };
    return { error: 'inviteInvalid' };
  }

  // The proof first, on its own: if filing below fails, the ordinary claim form
  // still finds it (consumeVerificationFor) and asks for no evidence.
  await admin.from('claim_verifications').upsert(
    {
      business_id: businessId,
      profile_id: user.id,
      code_hash: 'invite',
      sent_to: spent.email,
      method: 'email',
      attempts: 0,
      expires_at: now,
      verified_at: now,
    },
    { onConflict: 'business_id,profile_id' },
  );

  const proof = { verified_at: now, verification_method: 'email' as const, verified_contact: spent.email };

  const { data: pending } = await admin
    .from('business_claims')
    .select('id')
    .eq('business_id', businessId)
    .eq('claimant_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();
  const contactEmail = profile?.email ?? user.email ?? spent.email;
  const contactName = profile?.full_name?.trim() || contactEmail.split('@')[0];

  if (pending) {
    const { error } = await admin.from('business_claims').update(proof).eq('id', pending.id);
    if (error) {
      console.error('redeemClaimInvite (update):', error.message);
      return { error: 'generic' };
    }
  } else {
    const { error } = await admin.from('business_claims').insert({
      business_id: businessId,
      claimant_id: user.id,
      contact_name: contactName,
      contact_email: contactEmail,
      evidence: `Opened the single-use claim link emailed to ${spent.email}.`,
      ...proof,
    });
    if (error && error.code !== '23505') {
      console.error('redeemClaimInvite (insert):', error.message);
      return { error: 'generic' };
    }
    await notifyAdminsOfClaim(business.name, business.slug, contactName).catch((err) =>
      console.error('claim notification failed:', err),
    );
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/business/${business.slug}`);
  revalidatePath(`/${locale}/account`);
  return { submitted: true };
}

/**
 * Withdraws a claim the caller filed.
 *
 * The guard trigger permits a claimant exactly this one transition and nothing
 * else, so there is no need to re-check ownership here — but the filter is
 * scoped to the caller anyway, so a wrong id fails as "not found" rather than
 * as a permission error that would confirm the row exists.
 */
export async function withdrawClaim(claimId: string): Promise<ClaimState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notSignedIn' };

  const { error } = await supabase
    .from('business_claims')
    .update({ status: 'withdrawn' })
    .eq('id', claimId)
    .eq('claimant_id', user.id)
    .eq('status', 'pending');

  if (error) {
    console.error('withdrawClaim:', error.message);
    return { error: 'generic' };
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/account`);
  return { submitted: true };
}

/**
 * Emails the admins that a claim is waiting.
 *
 * Uses the admin client because it reads the profiles table for admin
 * addresses, which RLS quite correctly does not let an ordinary caller do.
 */
async function notifyAdminsOfClaim(
  businessName: string,
  businessSlug: string,
  claimantName: string,
) {
  const admin = createAdminClient();

  const { data: admins } = await admin
    .from('profiles')
    .select('email')
    .eq('role', 'admin')
    .is('deleted_at', null);

  const recipients = (admins ?? []).map((a) => a.email).filter(Boolean) as string[];
  if (!recipients.length) return;

  const email = getEmailProvider();
  // One message per admin rather than a single multi-recipient send: the
  // provider interface takes a single address, and putting every admin in one
  // `to` would expose their addresses to each other anyway.
  await Promise.all(
    recipients.map((to) =>
      email.send({
        to,
        subject: `Listing claim: ${businessName}`,
        text:
          `${claimantName} has claimed the listing for ${businessName}.\n\n` +
          `Review it: ${absoluteUrl('/admin/claims')}\n\n` +
          `Listing: ${absoluteUrl(`/business/${businessSlug}`)}\n`,
      }),
    ),
  );
}
