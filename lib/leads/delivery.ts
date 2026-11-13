import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getEmailProvider } from '@/lib/notifications';
import type { Json } from '@/lib/supabase/database.types';
import { absoluteUrl } from '@/lib/seo';
import { CLAIM_INVITE_DAYS, hashInviteToken, newInviteToken } from '@/lib/claims/invite-token';

/**
 * Who received an enquiry, and whether it actually reached them.
 *
 * `lead_businesses` records who an enquiry was *assigned* to. It never said
 * whether the operator was told: the email outcome was written only onto the
 * owner's in-app notification, and an unclaimed listing has no owner, so for
 * almost every recipient the answer was nowhere. Every attempt now leaves a
 * `lead_events` row against the enquiry and the business — `business_emailed`,
 * `business_email_failed` or `business_unreachable` — which is what the admin
 * enquiry page reads to say, per operator, "emailed to x@y at 14:02".
 */

type Admin = ReturnType<typeof createAdminClient>;

export type DeliveryOutcome =
  | { kind: 'emailed'; to: string }
  | { kind: 'failed'; to: string; error: string }
  | { kind: 'unreachable' };

export const DELIVERY_EVENTS = [
  'business_emailed',
  'business_email_failed',
  'business_unreachable',
] as const;

export async function recordDelivery(
  admin: Admin,
  entry: {
    leadId: string;
    businessId: string;
    outcome: DeliveryOutcome;
    actorId?: string | null;
    /** 'matched' for the automatic send, 'admin' for a forward or resend. */
    via: 'matched' | 'admin';
  },
) {
  const { outcome } = entry;
  const event =
    outcome.kind === 'emailed'
      ? 'business_emailed'
      : outcome.kind === 'failed'
        ? 'business_email_failed'
        : 'business_unreachable';

  const { error } = await admin.from('lead_events').insert({
    lead_id: entry.leadId,
    business_id: entry.businessId,
    actor_id: entry.actorId ?? null,
    event,
    detail: {
      via: entry.via,
      ...(outcome.kind !== 'unreachable' ? { to: outcome.to } : {}),
      ...(outcome.kind === 'failed' ? { error: outcome.error } : {}),
    } as Json,
  });
  // Losing the record is bad; losing the send over it would be worse.
  if (error) console.error('[lead] delivery record failed', entry.leadId, error.message);
}

/** The address to tell a business at: its own, else its owner's account. */
export async function addressFor(
  admin: Admin,
  business: { email: string | null; owner_id: string | null },
): Promise<string | null> {
  if (business.email) return business.email;
  if (!business.owner_id) return null;
  const { data } = await admin
    .from('profiles')
    .select('email')
    .eq('id', business.owner_id)
    .maybeSingle();
  return data?.email ?? null;
}

export type LeadForEmail = {
  reference: string;
  full_name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  travel_start: string | null;
  travel_end: string | null;
  dates_flexible: boolean;
  adults: number;
  children: number;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: string;
  interests: string[];
  message: string | null;
  destination_other: string | null;
  destinationName?: string | null;
  categoryName?: string | null;
};

/**
 * The email an admin's forward sends: the enquiry itself, not a link to it.
 *
 * The automatic notice says "view it at /dashboard/leads", which only an
 * operator with an account can open — and 3,300 of 3,344 listings have none.
 * A forward exists precisely because the enquiry did not land, so it carries
 * the trip, and (when the admin allows) the traveller's contact details so the
 * operator can answer today rather than after signing up.
 *
 * English, like the site-owner notice: it goes to an East African operator,
 * not to the traveller, and the traveller's own language is stated in it.
 */
export function forwardEmail({
  lead,
  businessName,
  businessSlug,
  claimed,
  includeContact,
  note,
  locale,
  claimUrl,
}: {
  lead: LeadForEmail;
  businessName: string;
  businessSlug: string;
  claimed: boolean;
  includeContact: boolean;
  note?: string | null;
  locale?: string;
  /** A single-use claim link for this operator; defaults to the plain claim page. */
  claimUrl?: string;
}) {
  const party = [
    `${lead.adults} adult${lead.adults === 1 ? '' : 's'}`,
    lead.children ? `${lead.children} child${lead.children === 1 ? '' : 'ren'}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const dates = lead.travel_start
    ? `${lead.travel_start}${lead.travel_end ? ` to ${lead.travel_end}` : ''}${lead.dates_flexible ? ' (flexible)' : ''}`
    : 'Not fixed yet';

  const budget =
    lead.budget_min !== null || lead.budget_max !== null
      ? `${lead.budget_currency} ${[lead.budget_min, lead.budget_max].filter((v) => v !== null).join(' – ')}`
      : null;

  const where = [lead.destinationName, lead.destination_other].filter(Boolean).join(' / ') || null;

  const lines = [
    `Hello ${businessName},`,
    '',
    `A traveller has asked for a quote through Explore Tanzania, and we have chosen your business to receive it (reference ${lead.reference}).`,
    ...(note ? ['', note] : []),
    '',
    '— The trip —',
    ...(where ? [`Where: ${where}`] : []),
    ...(lead.categoryName ? [`Looking for: ${lead.categoryName}`] : []),
    `When: ${dates}`,
    `Travellers: ${party}`,
    ...(budget ? [`Budget: ${budget}`] : []),
    ...(lead.interests.length ? [`Interests: ${lead.interests.join(', ')}`] : []),
    ...(locale && locale !== 'en' ? [`Wrote in: ${locale.toUpperCase()}`] : []),
    '',
    ...(lead.message ? ['— Their message —', lead.message, ''] : []),
  ];

  if (includeContact) {
    lines.push(
      '— Reply to the traveller —',
      `Name: ${lead.full_name}`,
      `Email: ${lead.email}`,
      ...(lead.phone ? [`Phone: ${lead.phone}`] : []),
      ...(lead.whatsapp ? [`WhatsApp: ${lead.whatsapp}`] : []),
      '',
      'Replying to this email reaches the traveller directly. Please quote within 24 hours: they have usually asked more than one operator.',
      '',
    );
  }

  lines.push(
    claimed
      ? `Manage this and future enquiries: ${absoluteUrl('/dashboard/leads')}`
      : includeContact
        ? `Your business is listed on Explore Tanzania but not yet claimed. Claim it free to receive enquiries like this one in your dashboard: ${claimUrl ?? absoluteUrl(`/business/${businessSlug}/claim`)}`
        : `To see this traveller's contact details and send your quote, claim your free listing on Explore Tanzania. It takes a few minutes: ${claimUrl ?? absoluteUrl(`/business/${businessSlug}/claim`)}`,
    '',
    '— Explore Tanzania',
  );

  return {
    subject: `New travel enquiry ${lead.reference}${where ? ` — ${where}` : ''}`,
    text: lines.join('\n'),
    // With contact details included, "reply" should go to the traveller, not
    // to a no-reply address the operator will never hear back from.
    replyTo: includeContact ? lead.email : undefined,
  };
}

export async function sendAndRecord(
  admin: Admin,
  args: {
    leadId: string;
    businessId: string;
    to: string | null;
    message: { subject: string; text: string; replyTo?: string } | null;
    via: 'matched' | 'admin';
    actorId?: string | null;
  },
): Promise<DeliveryOutcome> {
  let outcome: DeliveryOutcome;
  if (!args.to || !args.message) {
    outcome = { kind: 'unreachable' };
  } else {
    const result = await getEmailProvider().send({ to: args.to, ...args.message });
    outcome = result.ok
      ? { kind: 'emailed', to: args.to }
      : { kind: 'failed', to: args.to, error: result.error ?? 'unknown' };
  }
  await recordDelivery(admin, {
    leadId: args.leadId,
    businessId: args.businessId,
    outcome,
    actorId: args.actorId,
    via: args.via,
  });
  return outcome;
}

/**
 * A single-use claim link for an unclaimed operator being told about an
 * enquiry (claim_invites, migration 067). Falls back to the plain claim page
 * if the invite cannot be stored: the notice must still go.
 */
export async function claimLinkFor(
  admin: Admin,
  business: { id: string; slug: string },
  email: string,
): Promise<string> {
  const plain = absoluteUrl(`/business/${business.slug}/claim`);
  try {
    const token = newInviteToken();
    const { error } = await admin.from('claim_invites').insert({
      business_id: business.id,
      email,
      token_hash: hashInviteToken(token),
      expires_at: new Date(Date.now() + CLAIM_INVITE_DAYS * 86_400_000).toISOString(),
    });
    if (error) throw new Error(error.message);
    return `${plain}?invite=${token}`;
  } catch (err) {
    console.error('[lead] claim invite failed', business.slug, err);
    return plain;
  }
}

/** The enquiry in the shape forwardEmail wants, with English place names. */
export async function loadLeadForEmail(
  admin: Admin,
  leadId: string,
): Promise<(LeadForEmail & { locale: string }) | null> {
  const { data } = await admin
    .from('leads')
    .select(
      `reference, full_name, email, phone, whatsapp, travel_start, travel_end,
       dates_flexible, adults, children, budget_min, budget_max, budget_currency,
       interests, message, destination_other, locale,
       destinations (destination_translations (locale, name)),
       categories (category_translations (locale, name))`,
    )
    .eq('id', leadId)
    .maybeSingle();
  if (!data) return null;
  const en = (rows: Array<{ locale: string; name: string }> | undefined) =>
    rows?.find((r) => r.locale === 'en')?.name ?? rows?.[0]?.name ?? null;
  return {
    ...data,
    budget_min: data.budget_min === null ? null : Number(data.budget_min),
    budget_max: data.budget_max === null ? null : Number(data.budget_max),
    destinationName: en(data.destinations?.destination_translations),
    categoryName: en(data.categories?.category_translations),
  };
}
