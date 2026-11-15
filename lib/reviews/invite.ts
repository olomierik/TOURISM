import 'server-only';

import { getTranslations } from 'next-intl/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getEmailProvider } from '@/lib/notifications';
import { renderBrandedEmail } from '@/lib/notifications/template';
import { getPathname } from '@/i18n/navigation';
import { locales, defaultLocale, type Locale } from '@/i18n/routing';
import { siteUrl } from '@/lib/seo';

/**
 * Review invitations. The link's key is the lead_businesses row's
 * review_token, and two kinds of enquiry earn one:
 *
 *  - marked won by the operator: the review carries "Verified traveller"
 *    (migration 064);
 *  - answered by the operator, and the trip dates have passed: the review
 *    carries the weaker "verified enquiry" mark (022). Operators almost never
 *    mark an enquiry won — none had, by November 2026 — so waiting for that
 *    meant no traveller was ever asked.
 *
 * Which mark a review gets is decided by the database trigger, not here.
 */

/** An operator who replied: enough to ask the traveller, after the trip. */
export const ANSWERED_STATUSES = ['responded', 'quoted'] as const;

/** The trip is over, by the dates the traveller gave. */
export function tripEnded(travelStart: string | null, travelEnd: string | null): boolean {
  const ended = travelEnd ?? travelStart;
  return ended !== null && new Date(ended).getTime() < Date.now();
}

export type Invite = {
  leadBusinessId: string;
  leadId: string;
  status: string;
  /** The operator marked the enquiry won: the review shows as Verified traveller. */
  booked: boolean;
  travelStart: string | null;
  travelEnd: string | null;
  traveler: { id: string | null; name: string; email: string; locale: Locale };
  business: { id: string; name: string; slug: string; ownerId: string | null };
};

function localeOf(value: string): Locale {
  return (locales as readonly string[]).includes(value) ? (value as Locale) : defaultLocale;
}

const SELECT = `id, status, review_token, review_invited_at,
  leads!inner (id, full_name, email, locale, traveler_id, travel_start, travel_end),
  businesses!inner (id, name, slug, owner_id)`;

type Row = {
  id: string;
  status: string;
  review_token: string;
  review_invited_at: string | null;
  leads: { id: string; full_name: string; email: string; locale: string; traveler_id: string | null; travel_start: string | null; travel_end: string | null };
  businesses: { id: string; name: string; slug: string; owner_id: string | null };
};

function toInvite(r: Row): Invite {
  return {
    leadBusinessId: r.id,
    leadId: r.leads.id,
    status: r.status,
    booked: r.status === 'won',
    travelStart: r.leads.travel_start,
    travelEnd: r.leads.travel_end,
    traveler: {
      id: r.leads.traveler_id,
      name: r.leads.full_name,
      email: r.leads.email,
      locale: localeOf(r.leads.locale),
    },
    business: { id: r.businesses.id, name: r.businesses.name, slug: r.businesses.slug, ownerId: r.businesses.owner_id },
  };
}

/** The invitation behind a review link, or null. */
export async function getInvite(token: string): Promise<Invite | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data } = await createAdminClient()
    .from('lead_businesses')
    .select(SELECT)
    .eq('review_token', token)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as Row;
  const allowed =
    row.status === 'won' ||
    ((ANSWERED_STATUSES as readonly string[]).includes(row.status) && tripEnded(row.leads.travel_start, row.leads.travel_end));
  return allowed ? toInvite(row) : null;
}

/** The review link for a won enquiry, in the traveller's language. */
export function reviewLink(token: string, locale: Locale): string {
  return `${siteUrl}${getPathname({ href: { pathname: '/review/[token]', params: { token } }, locale })}`;
}

/**
 * Emails the traveller an invitation to review, once per operator.
 *
 * Called when an operator marks an enquiry won. If the trip is still ahead,
 * the email says the link will be waiting for them afterwards; a reminder at
 * the end of the trip belongs to the reminder emails, not here.
 */
export async function sendReviewInvite(leadBusinessId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from('lead_businesses').select(SELECT).eq('id', leadBusinessId).maybeSingle();
    if (!data) return;
    const row = data as unknown as Row;
    if (row.status !== 'won' || row.review_invited_at) return;

    const invite = toInvite(row);
    const locale = invite.traveler.locale;
    const t = await getTranslations({ locale, namespace: 'reviewInviteEmail' });
    const upcoming = invite.travelStart && new Date(invite.travelStart) > new Date();

    const mail = renderBrandedEmail({
      heading: t('heading', { business: invite.business.name }),
      paragraphs: [
        t('greeting', { name: invite.traveler.name.split(/\s+/)[0] || invite.traveler.name }),
        upcoming ? t('bodyUpcoming', { business: invite.business.name }) : t('body', { business: invite.business.name }),
      ],
      action: { label: t('cta'), url: reviewLink(row.review_token, locale) },
      footnote: t('footnote'),
    });

    await getEmailProvider().send({
      to: invite.traveler.email,
      subject: t('subject', { business: invite.business.name }),
      ...mail,
    });
    await admin
      .from('lead_businesses')
      .update({ review_invited_at: new Date().toISOString() })
      .eq('id', row.id);
  } catch (err) {
    // The enquiry is marked won either way; a lost invitation can be resent.
    console.error('[reviews] invite failed', leadBusinessId, err);
  }
}
