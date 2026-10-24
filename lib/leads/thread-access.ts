import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPathname } from '@/i18n/navigation';
import { locales, defaultLocale, type Locale } from '@/i18n/routing';
import { siteUrl } from '@/lib/seo';

/**
 * Who may act on a conversation (one lead_businesses row), shared by messages
 * and quotes. Server-only and not an action module, so none of this is
 * callable from the browser.
 */

export type Thread = {
  id: string;
  status: string;
  lead: {
    id: string;
    reference: string;
    full_name: string;
    email: string;
    locale: string;
    traveler_id: string | null;
    access_token: string;
  };
  business: { id: string; name: string; email: string | null; owner_id: string | null };
};

export async function loadThread(leadBusinessId: string): Promise<Thread | null> {
  if (!/^[0-9a-f-]{36}$/i.test(leadBusinessId)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from('lead_businesses')
    .select(
      `id, status,
       leads!inner (id, reference, full_name, email, locale, traveler_id, access_token),
       businesses!inner (id, name, email, owner_id)`,
    )
    .eq('id', leadBusinessId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    status: data.status,
    lead: data.leads as Thread['lead'],
    business: data.businesses as Thread['business'],
  };
}

/** Who is asking, as far as this thread is concerned. */
export async function sideOf(
  thread: Thread,
  token?: string,
): Promise<{ side: 'operator' | 'traveler'; profileId: string | null } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The traveller's key decides first: it is only ever used from the
  // traveller's page, even if an operator account is signed in on the browser.
  if (token) {
    return token === thread.lead.access_token
      ? { side: 'traveler', profileId: thread.lead.traveler_id === user?.id ? user.id : null }
      : null;
  }
  if (user && thread.business.owner_id === user.id) return { side: 'operator', profileId: user.id };
  if (user && thread.lead.traveler_id === user.id) return { side: 'traveler', profileId: user.id };
  return null;
}

export function localeOf(value: string): Locale {
  return (locales as readonly string[]).includes(value) ? (value as Locale) : defaultLocale;
}

/** The traveller's link to the conversation, with the key guests need. */
export function travelerLink(thread: Thread): string {
  const locale = localeOf(thread.lead.locale);
  const path = getPathname({
    href: { pathname: '/enquiry/[reference]', params: { reference: thread.lead.reference } },
    locale,
  });
  return `${siteUrl}${path}?t=${thread.lead.access_token}`;
}

export function excerpt(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > 600 ? `${flat.slice(0, 600)}…` : flat;
}
