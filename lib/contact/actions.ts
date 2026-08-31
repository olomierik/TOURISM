'use server';

import { headers } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { locales, type Locale } from '@/i18n/routing';

const TOPICS = ['general', 'correction', 'takedown', 'privacy', 'press', 'bug'] as const;
export type ContactTopic = (typeof TOPICS)[number];

export type ContactState = {
  error?: 'invalid' | 'tooShort' | 'rateLimited' | 'generic';
  sent?: boolean;
};

function isTopic(v: string): v is ContactTopic {
  return (TOPICS as readonly string[]).includes(v);
}

/**
 * Sends a contact message.
 *
 * Two things worth explaining.
 *
 * The rate limit counts prior messages from the same address, the way the quote
 * form does. It is not a real limiter — that belongs at the edge — but it stops
 * the obvious case of a form submitted forty times, and the comment in
 * lib/leads/actions.ts saying as much applies here word for word.
 *
 * The insert goes through the admin client rather than the caller's. The public
 * policy on this table is insert-only with no select, which is correct — a
 * readable contact table publishes the email address of everyone who ever wrote
 * in — but it means the anon client cannot read its own row back, and a
 * `.select()` on the insert would fail. The admin client is used for the write
 * alone and returns nothing to the page.
 */
export async function sendContactMessage(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const topicRaw = String(formData.get('topic') ?? 'general');
  const topic: ContactTopic = isTopic(topicRaw) ? topicRaw : 'general';

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const message = String(formData.get('message') ?? '').trim();
  const sourceUrl = String(formData.get('sourceUrl') ?? '').trim().slice(0, 500) || null;

  const localeRaw = String(formData.get('locale') ?? '');
  const locale = (locales as readonly string[]).includes(localeRaw)
    ? (localeRaw as Locale)
    : null;

  // A honeypot, matching the quote form's. A real person never fills this in.
  if (String(formData.get('et_hp_ref') ?? '') !== '') return { sent: true };

  if (name.length < 2 || name.length > 80) return { error: 'invalid' };
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return { error: 'invalid' };
  if (message.length < 20) return { error: 'tooShort' };
  if (message.length > 4000) return { error: 'invalid' };

  const admin = createAdminClient();

  // Cheap rate limit: the same address writing repeatedly in a short window is
  // either a mistake or a bot, and answering it helps nobody. Not a substitute
  // for a real limiter at the edge.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('contact_messages')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since);
  if ((count ?? 0) >= 3) return { error: 'rateLimited' };

  const { error } = await admin.from('contact_messages').insert({
    topic,
    name,
    email,
    message,
    source_url: sourceUrl,
    locale,
  });

  if (error) return { error: 'generic' };

  return { sent: true };
}

/**
 * Whether the signed-in caller is an admin.
 *
 * Used by the contact page only to decide whether to show a link to the admin
 * inbox; the inbox itself is protected by RLS and by the admin layout, so this
 * is a convenience rather than a gate.
 */
export async function viewerIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role === 'admin';
}

/** The page the visitor came from, for correction reports. */
export async function currentReferer(): Promise<string | null> {
  const h = await headers();
  return h.get('referer');
}
