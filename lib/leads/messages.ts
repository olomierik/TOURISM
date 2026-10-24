'use server';

import { getTranslations } from 'next-intl/server';
import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/lib/supabase/admin';
import { getEmailProvider } from '@/lib/notifications';
import { renderBrandedEmail } from '@/lib/notifications/template';
import { getPathname } from '@/i18n/navigation';
import { siteUrl } from '@/lib/seo';
import { loadThread, sideOf, localeOf, travelerLink, excerpt, type Thread } from '@/lib/leads/thread-access';

/**
 * Messages between a traveller and one operator about one enquiry
 * (lead_messages, migration 063).
 *
 * Every write is checked here and then made with the service role: the
 * operator must own the business the thread belongs to; the traveller must be
 * the signed-in owner of the enquiry or hold its access token (the key in the
 * links we email to travellers who enquired without an account).
 */

export type ThreadMessage = {
  id: string;
  sender: 'traveler' | 'operator';
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type SendResult = { message?: ThreadMessage; error?: 'notAllowed' | 'empty' | 'tooMany' | 'generic' };

const MAX_LENGTH = 4000;
/** Messages one side may send on a thread in ten minutes. */
const BURST_LIMIT = 15;


async function notify(thread: Thread, from: 'operator' | 'traveler', body: string) {
  try {
    const locale = localeOf(thread.lead.locale);
    const t = await getTranslations({ locale, namespace: 'threadEmail' });

    if (from === 'operator') {
      const mail = renderBrandedEmail({
        heading: t('toTravelerHeading', { business: thread.business.name }),
        paragraphs: [excerpt(body), t('toTravelerBody')],
        action: { label: t('toTravelerCta'), url: travelerLink(thread) },
        footnote: t('toTravelerFoot', { reference: thread.lead.reference }),
      });
      await getEmailProvider().send({
        to: thread.lead.email,
        subject: t('toTravelerSubject', { business: thread.business.name, reference: thread.lead.reference }),
        ...mail,
      });
      return;
    }

    // To the operator: the listing's address, else the owner's account address.
    let to = thread.business.email;
    if (!to && thread.business.owner_id) {
      const { data } = await createAdminClient().auth.admin.getUserById(thread.business.owner_id);
      to = data.user?.email ?? null;
    }
    if (!to) {
      console.warn('[thread] no address for operator', thread.business.id, thread.lead.reference);
      return;
    }
    const dashboard = `${siteUrl}${getPathname({ href: '/dashboard/leads', locale })}`;
    const mail = renderBrandedEmail({
      heading: t('toOperatorHeading', { name: thread.lead.full_name }),
      paragraphs: [excerpt(body)],
      action: { label: t('toOperatorCta'), url: dashboard },
      footnote: t('toOperatorFoot', { reference: thread.lead.reference }),
    });
    await getEmailProvider().send({
      to,
      subject: t('toOperatorSubject', { name: thread.lead.full_name, reference: thread.lead.reference }),
      ...mail,
    });
  } catch (err) {
    // The message is saved and visible in the thread; a lost notice is not
    // worth failing the send over.
    console.error('[thread] notice failed', thread.lead.reference, err);
  }
}

export async function sendMessage(
  leadBusinessId: string,
  rawBody: string,
  token?: string,
): Promise<SendResult> {
  const body = String(rawBody ?? '').trim().slice(0, MAX_LENGTH);
  if (!body) return { error: 'empty' };

  const thread = await loadThread(leadBusinessId);
  if (!thread) return { error: 'notAllowed' };
  const who = await sideOf(thread, token);
  if (!who) return { error: 'notAllowed' };

  const admin = createAdminClient();
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await admin
    .from('lead_messages')
    .select('id', { count: 'exact', head: true })
    .eq('lead_business_id', thread.id)
    .eq('sender', who.side)
    .gte('created_at', since);
  if ((count ?? 0) >= BURST_LIMIT) return { error: 'tooMany' };

  const { data, error } = await admin
    .from('lead_messages')
    .insert({
      lead_business_id: thread.id,
      sender: who.side,
      sender_profile_id: who.profileId,
      body,
    })
    .select('id, sender, body, created_at, read_at')
    .single();
  if (error || !data) {
    console.error('[thread] insert failed', thread.lead.reference, error?.message);
    return { error: 'generic' };
  }

  // An operator's first reply is a response: the existing trigger stamps
  // responded_at and the minutes it took, which feed "replies within Nh".
  if (who.side === 'operator' && (thread.status === 'sent' || thread.status === 'viewed')) {
    await admin.from('lead_businesses').update({ status: 'responded' }).eq('id', thread.id);
  }

  await notify(thread, who.side, body);

  revalidatePath('/dashboard/leads');
  return {
    message: {
      id: data.id,
      sender: data.sender as ThreadMessage['sender'],
      body: data.body,
      createdAt: data.created_at,
      readAt: data.read_at,
    },
  };
}

/** Marks the other side's messages on a thread as read by the caller. */
export async function markThreadRead(leadBusinessId: string, token?: string): Promise<void> {
  const thread = await loadThread(leadBusinessId);
  if (!thread) return;
  const who = await sideOf(thread, token);
  if (!who) return;
  await createAdminClient()
    .from('lead_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('lead_business_id', thread.id)
    .eq('sender', who.side === 'operator' ? 'traveler' : 'operator')
    .is('read_at', null);
}
