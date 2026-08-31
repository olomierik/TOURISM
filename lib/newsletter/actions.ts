'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { locales, type Locale } from '@/i18n/routing';

export type NewsletterState = { error?: 'invalid' | 'generic'; subscribed?: boolean };

/**
 * Adds an address to the newsletter list.
 *
 * Through the admin client because the public policy is insert-only with no
 * select — which is right, since a readable list of subscriber addresses is a
 * mailing list anybody can harvest — and an anon client therefore cannot read
 * its own row back to check for a conflict.
 *
 * Subscribing twice is a success, not an error. The person pressed the button
 * because they want the newsletter; telling them "you are already subscribed"
 * is a correction nobody asked for, and it also leaks whether a given address
 * is on the list to anyone willing to type it in.
 */
export async function subscribe(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const localeRaw = String(formData.get('locale') ?? '');
  const locale = (locales as readonly string[]).includes(localeRaw)
    ? (localeRaw as Locale)
    : null;
  const sourceRaw = String(formData.get('source') ?? 'homepage').trim();
  const source = /^[a-z_-]{1,32}$/.test(sourceRaw) ? sourceRaw : 'homepage';

  // The honeypot, matching the quote and contact forms.
  if (String(formData.get('et_hp_ref') ?? '') !== '') return { subscribed: true };

  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email) || email.length > 160) {
    return { error: 'invalid' };
  }

  const { error } = await createAdminClient()
    .from('newsletter_subscribers')
    .upsert({ email, locale, source }, { onConflict: 'email', ignoreDuplicates: true });

  if (error) return { error: 'generic' };

  return { subscribed: true };
}
