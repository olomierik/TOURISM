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
 * Plain module: used by client components.
 */
export function whatsappInviteMessage(name: string, claimUrl: string): string {
  return [
    `Hello ${name},`,
    '',
    'This is Explore Tanzania (exploretanzania.online), a travel directory for East Africa. Your business is listed with us, built from public map data.',
    '',
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
): string | null {
  const digits = whatsappNumberFor(listing);
  if (!digits) return null;
  const claimUrl = `${origin.replace(/\/$/, '')}/business/${listing.slug}/claim`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(whatsappInviteMessage(listing.name, claimUrl))}`;
}
