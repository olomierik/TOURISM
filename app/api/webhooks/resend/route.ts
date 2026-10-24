import { createAdminClient } from '@/lib/supabase/admin';
import { verifySvix } from '@/lib/email/svix';
import { normaliseEmail, suppressEmail, type SuppressionReason } from '@/lib/email/suppression';
import type { Json } from '@/lib/supabase/database.types';

/**
 * Resend's delivery webhooks: bounced, complained, suppressed.
 *
 * Signed by Svix with RESEND_WEBHOOK_SECRET; anything unsigned or stale is
 * refused before it is read. Each delivery is recorded once in email_events
 * (keyed by svix-id, which a retry repeats), and acting on it is idempotent,
 * so a retry after a timeout does no harm.
 *
 *   email.bounced, Permanent   the mailbox does not exist: suppressed for all
 *                              mail; an outreach row that bounced is marked so
 *   email.bounced, Temporary   full inbox, greylisting: recorded, nothing else
 *   email.complained           marked as spam: suppressed for outreach
 *   email.suppressed           Resend refused to send (it has seen this address
 *                              bounce or complain): suppressed for all mail
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ResendEvent = {
  type?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    bounce?: { type?: string; subType?: string; message?: string };
  };
};

function recipients(to: string[] | string | undefined): string[] {
  const list = Array.isArray(to) ? to : to ? [to] : [];
  return list
    .map((entry) => normaliseEmail(entry.match(/<([^>]+)>/)?.[1] ?? entry))
    .filter((address) => address.includes('@'));
}

async function act(event: ResendEvent): Promise<{ action: string; reason?: SuppressionReason }> {
  const to = recipients(event.data?.to);
  let reason: SuppressionReason | null = null;

  if (event.type === 'email.bounced') {
    if (event.data?.bounce?.type !== 'Permanent') return { action: 'ignored' };
    reason = 'bounced';
  } else if (event.type === 'email.complained') {
    reason = 'complaint';
  } else if (event.type === 'email.suppressed') {
    reason = 'provider-suppressed';
  } else {
    return { action: 'ignored' };
  }

  for (const address of to) await suppressEmail(address, reason);

  // The outreach message itself, when this was one: 'bounced' tells the admin
  // page the address is dead rather than merely skipped.
  if (reason === 'bounced' && event.data?.email_id) {
    await createAdminClient()
      .from('operator_outreach')
      .update({
        status: 'bounced',
        error: (event.data.bounce?.message ?? 'bounced').slice(0, 300),
      })
      .eq('provider_ref', event.data.email_id);
  }

  return { action: 'suppressed', reason };
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response('Webhook not configured', { status: 503 });

  const body = await request.text();
  const id = request.headers.get('svix-id');
  const ok = verifySvix({
    secret,
    id,
    timestamp: request.headers.get('svix-timestamp'),
    signature: request.headers.get('svix-signature'),
    body,
  });
  if (!ok || !id) return new Response('Invalid signature', { status: 401 });

  let event: ResendEvent;
  try {
    event = JSON.parse(body) as ResendEvent;
  } catch {
    return new Response('Invalid body', { status: 400 });
  }

  const admin = createAdminClient();
  const { data: seen } = await admin.from('email_events').select('id').eq('id', id).maybeSingle();
  if (seen) return Response.json({ ok: true, duplicate: true });

  let outcome: { action: string; reason?: SuppressionReason };
  try {
    outcome = await act(event);
  } catch (err) {
    console.error('[resend-webhook]', event.type, err);
    // Not recorded, so Resend's retry gets another go.
    return new Response('Could not process', { status: 500 });
  }

  const to = recipients(event.data?.to);
  const { error } = await admin.from('email_events').upsert(
    {
      id,
      type: String(event.type ?? 'unknown').slice(0, 60),
      email: to[0] ?? null,
      provider_ref: event.data?.email_id ?? null,
      action: outcome.action,
      detail: (event.data?.bounce ?? null) as Json,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (error) console.error('[resend-webhook] record failed', id, error.message);

  return Response.json({ ok: true, action: outcome.action });
}
