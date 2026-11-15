import 'server-only';

import type { createAdminClient } from '@/lib/supabase/admin';
import { subjectFor, bodyFor, provenanceFor } from '@/lib/outreach/message';
import { sourceOf } from '@/lib/outreach/provenance';
import { unsubscribeUrl } from '@/lib/outreach/unsubscribe';
import { domainMatches } from '@/lib/claims/domain-match';
import {
  CLAIM_INVITE_DAYS,
  hashInviteToken,
  newInviteToken,
  withInvite,
} from '@/lib/claims/invite-token';

/**
 * Sends one claim invitation to one business. The single place that does.
 *
 * The admin's "Send now" button and the "Send next 90" batch both end here, so
 * every guard is applied once and cannot drift between them:
 *
 *   - **Refuses without a real mailer.** `lib/notifications` returns ok with no
 *     API key, which is right for leads and would be a catastrophe here: a row
 *     marked sent that never went, against a one-send-per-business index.
 *   - **Re-checks at send time** — suppressed, already claimed, already sent.
 *   - **Mints the claim token here**, so the link works the moment the message
 *     lands, and deletes it again if the send fails.
 *
 * The caller is responsible for checking that an admin asked.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

type Admin = ReturnType<typeof createAdminClient>;

export type OutreachConfig = { apiKey: string; from: string; replyTo: string; siteUrl: string };

export type DeliverResult =
  | { kind: 'sent'; name: string }
  /** Not sent, and rightly: claimed, unsubscribed, already sent, no address. */
  | { kind: 'skipped'; reason: string }
  /**
   * `fatal` means the fault is ours, not the address's — a bad key, a spent
   * daily quota — so the next message would fail the same way.
   */
  | { kind: 'failed'; reason: string; fatal: boolean };

export const NO_MAILER =
  'RESEND_API_KEY and a From address are not both set. Refusing to send: ' +
  'the row would be marked sent and nothing would arrive.';

export function outreachConfig(): OutreachConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OUTREACH_FROM || process.env.EMAIL_FROM;
  if (!apiKey || !from) return null;
  return {
    apiKey,
    from,
    replyTo: process.env.OUTREACH_REPLY_TO ?? 'hello@exploretanzania.online',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://exploretanzania.online',
  };
}

export async function deliverOutreach(
  admin: Admin,
  businessId: string,
  config: OutreachConfig,
  /** The batch label a newly created row is filed under. */
  batch = 'manual',
): Promise<DeliverResult> {
  const { apiKey, from, replyTo, siteUrl } = config;

  const { data: business } = await admin
    .from('businesses')
    .select('id, slug, name, email, website, country_code, owner_id, status, deleted_at')
    .eq('id', businessId)
    .maybeSingle();

  if (!business) return { kind: 'skipped', reason: 'That business no longer exists.' };
  if (business.deleted_at || business.status !== 'approved') {
    return { kind: 'skipped', reason: 'That listing is not live.' };
  }
  if (!business.email) return { kind: 'skipped', reason: 'That listing has no email address.' };
  if (business.owner_id) return { kind: 'skipped', reason: 'Already claimed — nothing to invite.' };

  // The list stores addresses lower-cased; a register may not have.
  const { count: suppressed } = await admin
    .from('outreach_suppressions')
    .select('email', { count: 'exact', head: true })
    .in('email', [business.email, business.email.trim().toLowerCase()]);
  if ((suppressed ?? 0) > 0) {
    return { kind: 'skipped', reason: 'That address has unsubscribed. Not sending.' };
  }

  // An existing row is reused rather than duplicated: there is one send per
  // business, and a failed attempt should become a second attempt on the same
  // record, not a second record.
  const { data: existing } = await admin
    .from('operator_outreach')
    .select('id, status, subject, body')
    .eq('business_id', business.id)
    .maybeSingle();

  if (existing?.status === 'sent') {
    return { kind: 'skipped', reason: 'Already sent to that business.' };
  }
  if (existing?.status === 'bounced') {
    return { kind: 'skipped', reason: 'That address bounced. Correct it before retrying.' };
  }

  const { data: translation } = await admin
    .from('business_translations')
    .select('description')
    .eq('business_id', business.id)
    .eq('locale', 'en')
    .maybeSingle();

  const source = sourceOf(translation?.description ?? '');

  // Reuse an approved draft's wording if there is one — an admin may have
  // edited it — and otherwise compose the same message the stager would.
  let subject = existing?.subject;
  let body = existing?.body;
  if (!subject || !body) {
    const instantVerify =
      Boolean(business.website) && domainMatches(business.website, business.email);
    subject = subjectFor(business.name);
    body = bodyFor({
      businessName: business.name,
      claimUrl: `${siteUrl}/business/${business.slug}/claim`,
      provenance: provenanceFor(source),
      instantVerify,
      contactEmail: business.email,
      removalEmail: replyTo,
      unsubscribeUrl: unsubscribeUrl(business.email, siteUrl),
      countryCode: business.country_code,
    });
  }

  let outreachId = existing?.id;
  if (!outreachId) {
    const { data: made, error: insertError } = await admin
      .from('operator_outreach')
      .insert({
        business_id: business.id,
        email: business.email,
        source: source ?? 'unknown',
        batch,
        status: 'queued',
        subject,
        body,
      })
      .select('id')
      .single();
    if (insertError || !made) {
      return { kind: 'failed', reason: 'Could not record the message.', fatal: false };
    }
    outreachId = made.id;
  }

  // The claim link becomes this recipient's alone. Minted before the send so
  // it works the moment the message lands; removed again if it never does.
  const token = newInviteToken();
  const withLink = withInvite(body, business.slug, token);
  let inviteId: string | null = null;
  if (withLink) {
    const { data: invite } = await admin
      .from('claim_invites')
      .insert({
        business_id: business.id,
        outreach_id: outreachId,
        email: business.email,
        token_hash: hashInviteToken(token),
        expires_at: new Date(Date.now() + CLAIM_INVITE_DAYS * 86_400_000).toISOString(),
      })
      .select('id')
      .single();
    inviteId = invite?.id ?? null;
  }
  const text = withLink ?? body;

  const markFailed = async (error: string) => {
    if (inviteId) await admin.from('claim_invites').delete().eq('id', inviteId);
    await admin
      .from('operator_outreach')
      .update({ status: 'failed', provider: 'resend', error: error.slice(0, 300) })
      .eq('id', outreachId);
  };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [business.email],
        reply_to: replyTo,
        subject,
        text,
        // Gmail's bulk-sender rules want a machine-readable way out, and its
        // absence is a spam signal however the body is worded.
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl(business.email, siteUrl)}>, <mailto:${replyTo}?subject=remove>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });

    const payload: { id?: string; message?: string } = await res.json().catch(() => ({}));

    if (!res.ok) {
      await markFailed(`${res.status}: ${payload.message ?? 'unknown'}`);
      return {
        kind: 'failed',
        reason: `Send failed: ${res.status} ${payload.message ?? ''}`.trim(),
        // Wrong key, forbidden sender, or the rate or daily limit: ours.
        fatal: [401, 403, 429].includes(res.status),
      };
    }

    await admin
      .from('operator_outreach')
      .update({
        status: 'sent',
        provider: 'resend',
        provider_ref: payload.id ?? null,
        sent_at: new Date().toISOString(),
        error: null,
      })
      .eq('id', outreachId);

    return { kind: 'sent', name: business.name };
  } catch (err) {
    await markFailed(String(err instanceof Error ? err.message : err));
    return {
      kind: 'failed',
      reason: 'Send failed. The message is recorded as failed and can be retried.',
      fatal: false,
    };
  }
}
