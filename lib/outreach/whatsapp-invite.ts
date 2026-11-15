import { whatsappNumberFor } from '@/lib/contact/whatsapp';

/**
 * A WhatsApp claim invitation, for the listings email cannot reach.
 *
 * Most unclaimed listings came from map data: a name, a phone number and no
 * email address. The outreach tooling is email-only, so those operators have
 * never been told their listing exists. This builds a wa.me link an admin
 * opens on their own phone or WhatsApp Web, with the message filled in — a
 * person sends it, one operator at a time, which is both what WhatsApp's
 * terms allow and what an operator will actually read.
 *
 * The link in the message is the ordinary claim page, not a single-use
 * invite: those record "opened the link we emailed to X" as proof of
 * ownership (claim_invites, 067), and a WhatsApp message proves no email. The
 * operator goes through the normal claim checks.
 *
 * When travellers have already tapped WhatsApp on the listing, the message
 * says how many (contactCountLine). That is the one sentence an operator can
 * check for themselves, in the very app the message arrives in: the chat a
 * traveller opens is pre-written and names Explore Tanzania in every
 * language the site offers. The email version is lib/outreach/contact-report.ts.
 *
 * Plain module: used by client components. Nothing here may import node code
 * (contact-report.ts pulls in node:crypto through the claim-token module).
 */

/**
 * Days of WhatsApp chats the admin list asks for. The real window can be
 * shorter: trustedWindow() never starts before CONTACT_CLICKS_TRUSTED_FROM.
 */
export const CONTACT_WINDOW_DAYS = 30;

/**
 * One line stating how many different people opened a chat, worded so it can
 * be checked. `days` must be the span really counted (trustedWindow().days).
 */
export function contactCountLine(contacts: number, days: number): string {
  return contacts === 1
    ? `In the last ${days} days, 1 person opened a WhatsApp chat to you from your listing. Search your chats for "Explore Tanzania" to find it.`
    : `In the last ${days} days, ${contacts} people opened a WhatsApp chat to you from your listing. Search your chats for "Explore Tanzania" to find them.`;
}

/** People who opened a chat, and the days that count covers. */
export type ContactCount = { contacts: number; days: number };

export function whatsappInviteMessage(name: string, claimUrl: string, count?: ContactCount): string {
  return [
    `Hello ${name},`,
    '',
    'This is Explore Tanzania (exploretanzania.online), a travel directory for East Africa. Your business is listed with us, built from public map data.',
    '',
    ...(count && count.contacts > 0 ? [contactCountLine(count.contacts, count.days), ''] : []),
    'Travellers use the site to ask local operators for quotes. Claim your listing free to add your photos and prices and to receive those enquiries:',
    claimUrl,
    '',
    'If you would rather not be listed, reply here and we will remove it.',
  ].join('\n');
}

export function whatsappInviteHref(
  listing: {
    name: string;
    slug: string;
    whatsapp?: string | null;
    phone?: string | null;
    countryCode?: string | null;
  },
  origin: string,
  count?: ContactCount,
): string | null {
  const digits = whatsappNumberFor(listing);
  if (!digits) return null;
  const claimUrl = `${origin.replace(/\/$/, '')}/business/${listing.slug}/claim`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(whatsappInviteMessage(listing.name, claimUrl, count))}`;
}
