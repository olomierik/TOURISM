'use server';

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseSecretKey } from '@/lib/supabase/env';
import { getEmailProvider } from '@/lib/notifications';
import { domainMatches } from '@/lib/claims/domain-match';

/**
 * Proving a claim by the address the licensing register already published.
 *
 * The claim form asks for evidence and an admin reads it. That authenticates
 * nobody — it authenticates a paragraph. 403 listings carry a contact address
 * the operator gave to KATO or to the Uganda Tourism Board, and a code sent
 * there proves control of that mailbox, which is a fact rather than an
 * assertion.
 *
 * It does not approve anything. An admin still decides; this just tells them
 * which claims are worth two seconds instead of ten minutes.
 */

export type VerifyState = {
  error?:
    | 'notSignedIn'
    | 'notFound'
    | 'noContact'
    | 'alreadyClaimed'
    | 'codeExpired'
    | 'codeWrong'
    | 'tooManyAttempts'
    | 'generic';
  sentTo?: string;
  verified?: boolean;
  /** How the proof was obtained, for wording the confirmation. */
  method?: 'email' | 'domain';
};

const CODE_TTL_MINUTES = 30;
const MAX_ATTEMPTS = 5;

/** HMAC, not the code. The row is server-only, but a bare code in a table is still a code in a table. */
function hashCode(code: string, businessId: string): string {
  return createHmac('sha256', getSupabaseSecretKey())
    .update(`${businessId}:${code}`)
    .digest('hex');
}

/**
 * Shows enough of the address to recognise, not enough to learn.
 *
 * The claimant needs to know which mailbox to open. Someone probing a listing
 * they have no connection to should not come away with a harvestable address —
 * these came from a public register, but a directory that prints them on demand
 * is a directory that gets scraped for them.
 */
function maskEmail(email: string): string {
  const [user = '', domain = ''] = email.split('@');
  const head = user.slice(0, 1);
  const tail = user.length > 2 ? user.slice(-1) : '';
  return `${head}${'*'.repeat(Math.max(3, user.length - 2))}${tail}@${domain}`;
}

/**
 * Writes a spent, already-verified row for a domain match.
 *
 * Same table and same shape as a completed code exchange, so consumeVerificationFor
 * finds it without knowing which route produced it. code_hash gets a value no
 * code can hash to — the row is proof, not a challenge, and leaving the column
 * nullable would make a NULL indistinguishable from a bug.
 */
async function recordDomainProof(
  businessId: string,
  profileId: string,
  contact: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await admin.from('claim_verifications').upsert(
    {
      business_id: businessId,
      profile_id: profileId,
      code_hash: 'domain',
      sent_to: contact,
      method: 'domain',
      attempts: 0,
      expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
      verified_at: now,
    },
    { onConflict: 'business_id,profile_id' },
  );

  if (error) {
    console.error('recordDomainProof:', error.message);
    return false;
  }
  return true;
}

/**
 * Sends a code to the listing's published contact address.
 *
 * Deliberately not to an address the claimant supplies. The whole point is that
 * the destination is fixed by the register, so completing the flow demonstrates
 * access to it.
 */
export async function requestClaimVerification(businessId: string): Promise<VerifyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notSignedIn' };

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, email, website, owner_id, status')
    .eq('id', businessId)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .maybeSingle();

  if (!business) return { error: 'notFound' };
  if (business.owner_id) return { error: 'alreadyClaimed' };

  // Shortcut, and the one that reaches most listings: if the signed-in address
  // sits on the domain the listing publishes, the mailbox is already proved and
  // there is nothing to send. Supabase confirmed that address at sign-up, so
  // the chain is complete before this function is called.
  if (
    domainMatches(business.website, user.email) ||
    domainMatches(business.email, user.email)
  ) {
    const proved = await recordDomainProof(businessId, user.id, user.email ?? '');
    if (proved) return { verified: true, method: 'domain', sentTo: user.email ?? undefined };
    return { error: 'generic' };
  }

  // No published address means no mailbox to prove control of. The evidence
  // path is still open; this one simply does not apply.
  if (!business.email) return { error: 'noContact' };

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const admin = createAdminClient();

  const { error } = await admin.from('claim_verifications').upsert(
    {
      business_id: businessId,
      profile_id: user.id,
      code_hash: hashCode(code, businessId),
      sent_to: business.email,
      attempts: 0,
      expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
      verified_at: null,
    },
    { onConflict: 'business_id,profile_id' },
  );

  if (error) {
    console.error('requestClaimVerification:', error.message);
    return { error: 'generic' };
  }

  try {
    const email = getEmailProvider();
    await email.send({
      to: business.email,
      subject: `Confirm you manage ${business.name}`,
      text:
        `Someone is claiming the Explore Tanzania listing for ${business.name}.\n\n` +
        `Verification code: ${code}\n\n` +
        `The code expires in ${CODE_TTL_MINUTES} minutes.\n\n` +
        `If this was not you, ignore this message — a claim cannot be approved ` +
        `without a review, and nothing changes until then.\n\n` +
        `— Explore Tanzania`,
    });
  } catch (err) {
    console.error('claim verification email failed:', err);
    return { error: 'generic' };
  }

  return { sentTo: maskEmail(business.email) };
}

/**
 * Checks a code and marks the claim verified.
 *
 * Compared in constant time, attempts counted, and the row is spent on success
 * so a code cannot be replayed. A wrong code and an expired one are reported
 * distinctly on purpose: both are the claimant's own mailbox, so there is
 * nothing to learn from the difference, and "wrong code" when the real problem
 * is thirty minutes elapsed sends people in circles.
 */
export async function confirmClaimVerification(
  businessId: string,
  code: string,
): Promise<VerifyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notSignedIn' };

  const admin = createAdminClient();

  const { data: challenge } = await admin
    .from('claim_verifications')
    .select('id, code_hash, sent_to, attempts, expires_at, verified_at')
    .eq('business_id', businessId)
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!challenge) return { error: 'notFound' };
  if (challenge.attempts >= MAX_ATTEMPTS) return { error: 'tooManyAttempts' };
  if (new Date(challenge.expires_at) < new Date()) return { error: 'codeExpired' };

  const supplied = Buffer.from(hashCode(code.trim(), businessId));
  const expected = Buffer.from(challenge.code_hash);
  const ok = supplied.length === expected.length && timingSafeEqual(supplied, expected);

  if (!ok) {
    await admin
      .from('claim_verifications')
      .update({ attempts: challenge.attempts + 1 })
      .eq('id', challenge.id);
    return { error: 'codeWrong' };
  }

  const now = new Date().toISOString();

  await admin.from('claim_verifications').update({ verified_at: now }).eq('id', challenge.id);

  // Stamped on any pending claim this person has filed. A claimant who verifies
  // before filing gets it applied when they file — see submitClaim.
  await admin
    .from('business_claims')
    .update({
      verified_at: now,
      verification_method: 'email',
      verified_contact: challenge.sent_to,
    })
    .eq('business_id', businessId)
    .eq('claimant_id', user.id)
    .eq('status', 'pending');

  return { verified: true, sentTo: maskEmail(challenge.sent_to) };
}

/**
 * Whether this person already proved control of this listing's mailbox.
 *
 * Called when a claim is filed, so verifying first and filing second works as
 * well as the other order — people do not read forms in the order they were
 * written.
 */
export async function consumeVerificationFor(
  businessId: string,
  profileId: string,
): Promise<{ verifiedAt: string; contact: string; method: 'email' | 'domain' } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('claim_verifications')
    .select('verified_at, sent_to, method')
    .eq('business_id', businessId)
    .eq('profile_id', profileId)
    .not('verified_at', 'is', null)
    .maybeSingle();

  if (!data?.verified_at) return null;

  // 'manual' is an admin decision recorded on the claim itself and never
  // written here, so anything in this table is one of the two self-serve routes.
  const method = data.method === 'domain' ? 'domain' : 'email';
  return { verifiedAt: data.verified_at, contact: data.sent_to, method };
}
