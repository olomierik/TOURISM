'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOutreachAdmin } from '@/lib/outreach/guard';
import { whatsappNumberFor } from '@/lib/contact/whatsapp';
import { DAILY_CAP } from '@/lib/outreach/batch-shared';

/**
 * The next ninety operators to invite on WhatsApp, for the queue on the
 * unreached page.
 *
 * WhatsApp will not let a website send a message; a person presses send in
 * their own app. So "ninety on one click" here means ninety chats lined up,
 * each with the invitation written, opened one after another
 * (components/admin/whatsapp-queue.tsx). This picks who: listings in the
 * group on screen with a number WhatsApp can reach, that no admin has opened
 * an invitation for before. Nothing is sent or recorded here.
 */

const GROUPS = ['never', 'staged', 'sent', 'failed', 'bounced', 'no-address'] as const;
type Group = (typeof GROUPS)[number];

export type WhatsAppTarget = {
  id: string;
  name: string;
  slug: string;
  whatsapp: string | null;
  phone: string | null;
  countryCode: string | null;
  city: string | null;
};

export type WhatsAppPlan = { error: string } | { targets: WhatsAppTarget[] };

const FIELDS = 'id, slug, name, phone, whatsapp, country_code, city';
const PAGE = 500;
/** Rows read before giving up on filling the run. */
const MAX_PAGES = 8;

export async function planWhatsAppBatch(group: string, country: string): Promise<WhatsAppPlan> {
  if (!(await requireOutreachAdmin())) return { error: 'Not authorised.' };
  if (!(GROUPS as readonly string[]).includes(group)) return { error: 'Unknown group.' };
  const cc = /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : '';

  const admin = createAdminClient();

  // Everyone an admin has already opened an invitation for. Paged: an
  // unpaginated select stops silently at 1,000 rows.
  const invited = new Set<string>();
  for (let page = 0; ; page++) {
    const { data, error } = await admin
      .from('audit_logs')
      .select('entity_id')
      .eq('action', 'business.whatsapp_invite_opened')
      .range(page * 1000, page * 1000 + 999);
    if (error) {
      console.error('planWhatsAppBatch:', error.message);
      return { error: 'Could not read who has been invited. Try again.' };
    }
    for (const r of data ?? []) if (r.entity_id) invited.add(r.entity_id);
    if (!data || data.length < 1000) break;
  }

  const base = (select: string) => {
    const q = admin
      .from('businesses')
      .select(select)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .is('owner_id', null)
      .or('whatsapp.not.is.null,phone.not.is.null');
    return cc ? q.eq('country_code', cc) : q;
  };
  const withEmail = (select: string) => base(select).not('email', 'is', null).neq('email', '');
  const forGroup = () => {
    switch (group as Group) {
      case 'no-address':
        return base(FIELDS).or('email.is.null,email.eq.');
      case 'never':
        return withEmail(`${FIELDS}, operator_outreach!left(business_id)`).is('operator_outreach', null);
      case 'staged':
        return withEmail(`${FIELDS}, operator_outreach!inner(status)`).in(
          'operator_outreach.status',
          ['draft', 'queued', 'skipped'],
        );
      default:
        return withEmail(`${FIELDS}, operator_outreach!inner(status)`).eq(
          'operator_outreach.status',
          group as 'sent' | 'failed' | 'bounced',
        );
    }
  };

  // One chat per number per run: map data repeats a number across branches.
  const numbers = new Set<string>();
  const targets: WhatsAppTarget[] = [];
  for (let page = 0; page < MAX_PAGES && targets.length < DAILY_CAP; page++) {
    const { data, error } = await forGroup()
      .order('name')
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) {
      console.error('planWhatsAppBatch:', error.message);
      return { error: 'Could not read the list. Try again.' };
    }
    const rows = (data ?? []) as unknown as Array<{
      id: string;
      slug: string;
      name: string;
      phone: string | null;
      whatsapp: string | null;
      country_code: string | null;
      city: string | null;
    }>;
    for (const b of rows) {
      if (invited.has(b.id)) continue;
      const digits = whatsappNumberFor({ whatsapp: b.whatsapp, phone: b.phone, countryCode: b.country_code });
      if (!digits || numbers.has(digits)) continue;
      numbers.add(digits);
      targets.push({
        id: b.id,
        name: b.name,
        slug: b.slug,
        whatsapp: b.whatsapp,
        phone: b.phone,
        countryCode: b.country_code,
        city: b.city,
      });
      if (targets.length === DAILY_CAP) break;
    }
    if (rows.length < PAGE) break;
  }

  return { targets };
}
