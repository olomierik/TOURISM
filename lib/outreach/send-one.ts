'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { subjectFor, bodyFor, provenanceFor } from '@/lib/outreach/message';
import { unsubscribeUrl } from '@/lib/outreach/unsubscribe';
import { domainMatches } from '@/lib/claims/domain-match';
import {
  CLAIM_INVITE_DAYS,
  hashInviteToken,
  newInviteToken,
  withInvite,
} from '@/lib/claims/invite-token';

/**
 * Send one outreach message, now, from the admin console.
 *
 * The bulk path is deliberately two scripts — `stage-outreach` writes drafts
 * and `send-outreach` needs an explicit `--batch` and `--confirm` at a
 * terminal. That shape exists to prevent one specific accident: a script run
 * with the wrong filter at 1am, and four hundred real businesses hearing about
 * it before anyone notices.
 *
 * This does not weaken that. It sends exactly one message to one business, from
 * a page where an admin is looking at that business's name and address. One at
 * a time cannot become four hundred by accident, which was the whole risk the
 * two-step design was guarding against. What it buys is the case the scripts
 * handle badly: a send that failed, a bounced address someone has since
 * corrected, or a single operator worth contacting now rather than in the next
 * batch.
 *
 * Every guard the send script applies is applied here, for the same reasons:
 *
 *   - **Admin re-checked server-side.** A server action is a public endpoint
 *     with a hard-to-guess name; the admin layout is a rendering decision.
 *   - **Refuses without a real mailer.** `lib/notifications` returns ok with no
 *     API key, which is right for leads and would be a catastrophe here: a row
 *     marked sent that never went, against a one-send-per-business index.
 *   - **Re-checks at send time** — suppressed, already claimed, already sent.
 *   - **Mints the claim token here**, so the link works the moment the message
 *     lands, and deletes it again if the send fails.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export type SendOneState = { error?: string; done?: string };

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
    .maybeSingle();

  return profile?.role === 'admin' ? user : null;
}

/** Which register an address came from, read out of the English description. */
function sourceOf(description: string | null | undefined): string | null {
  const d = description ?? '';
  if (/Kenya Association of Tour Operators/i.test(d)) return 'kato';
  if (/Uganda Tourism Board/i.test(d)) return 'utb';
  if (/listed on Google Maps/i.test(d)) return 'gmaps';
  return null;
}

export async function sendOneOutreach(
  _prev: SendOneState,
  formData: FormData,
): Promise<SendOneState> {
  if (!(await requireAdmin())) return { error: 'Not authorised.' };

  const businessId = String(formData.get('businessId') ?? '');
  if (!businessId) return { error: 'No business given.' };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OUTREACH_FROM || process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return {
      error:
        'RESEND_API_KEY and a From address are not both set. Refusing to send: ' +
        'the row would be marked sent and nothing would arrive.',
    };
  }
  const replyTo = process.env.OUTREACH_REPLY_TO ?? 'hello@exploretanzania.online';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://exploretanzania.online';

  // Admin client: this writes outreach rows and claim invites, which the
  // cookie-bound client cannot under RLS.
  const admin = createAdminClient();

  const { data: business } = await admin
    .from('businesses')
    .select('id, slug, name, email, website, country_code, owner_id, status, deleted_at')
    .eq('id', businessId)
    .maybeSingle();

  if (!business) return { error: 'That business no longer exists.' };
  if (business.deleted_at || business.status !== 'approved') {
    return { error: 'That listing is not live.' };
  }
  if (!business.email) return { error: 'That listing has no email address.' };
  if (business.owner_id) return { error: 'Already claimed — nothing to invite.' };

  const { count: suppressed } = await admin
    .from('outreach_suppressions')
    .select('email', { count: 'exact', head: true })
    .eq('email', business.email);
  if ((suppressed ?? 0) > 0) {
    return { error: 'That address has unsubscribed. Not sending.' };
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
    return { error: 'Already sent to that business.' };
  }

  const { data: translation } = await admin
    .from('business_translations')
    .select('description')
    .eq('business_id', business.id)
    .eq('locale', 'en')
    .maybeSingle();

  const source = sourceOf(translation?.description);

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
        batch: 'manual',
        status: 'queued',
        subject,
        body,
      })
      .select('id')
      .single();
    if (insertError || !made) return { error: 'Could not record the message.' };
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
      if (inviteId) await admin.from('claim_invites').delete().eq('id', inviteId);
      await admin
        .from('operator_outreach')
        .update({
          status: 'failed',
          provider: 'resend',
          error: `${res.status}: ${payload.message ?? 'unknown'}`.slice(0, 300),
        })
        .eq('id', outreachId);
      revalidatePath('/admin/outreach/unreached');
      return { error: `Send failed: ${res.status} ${payload.message ?? ''}`.trim() };
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

    revalidatePath('/admin/outreach/unreached');
    return { done: `Sent to ${business.name}.` };
  } catch (err) {
    if (inviteId) await admin.from('claim_invites').delete().eq('id', inviteId);
    await admin
      .from('operator_outreach')
      .update({
        status: 'failed',
        provider: 'resend',
        error: String(err instanceof Error ? err.message : err).slice(0, 300),
      })
      .eq('id', outreachId);
    revalidatePath('/admin/outreach/unreached');
    return { error: 'Send failed. The message is recorded as failed and can be retried.' };
  }
}
