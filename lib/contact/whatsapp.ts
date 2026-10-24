/**
 * The number that reaches an operator on WhatsApp, if there is one.
 *
 * Two of 2,618 listings carry a WhatsApp number; 2,045 carry a phone, mostly
 * from map data, and 1,527 of those have no email at all. In East Africa a
 * business mobile is almost always on WhatsApp, so a mobile number stands in
 * when the listing gives no WhatsApp number of its own. Landlines never do:
 * wa.me with a landline opens an error in the traveller's app.
 *
 * Plain module, no server-only import: cards, the business page and the redirect
 * route all ask the same question and must get the same answer.
 */

/** Calling code per country, for numbers written in local form (0748 …). */
const CALLING_CODE: Record<string, string> = { TZ: '255', KE: '254', UG: '256', RW: '250' };

/** Mobile ranges, as digits after the calling code. */
const MOBILE = [
  /^255[67]\d{8}$/, // Tanzania: 6x and 7x
  /^254(7\d|1[01])\d{7}$/, // Kenya: 7xx, 10x and 11x
  /^256(7\d)\d{7}$/, // Uganda: 7xx
  /^250(7[2389])\d{7}$/, // Rwanda: 72, 73, 78, 79
];

/** Digits in international form (no +), or null if it cannot be read as one. */
export function internationalDigits(raw: string | null | undefined, countryCode?: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (raw.trim().startsWith('00')) digits = digits.replace(/^00/, '');
  const code = countryCode ? CALLING_CODE[countryCode.toUpperCase()] : undefined;
  if (code && digits.startsWith('0') && !digits.startsWith('00')) digits = code + digits.slice(1);
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function isEastAfricanMobile(digits: string): boolean {
  return MOBILE.some((re) => re.test(digits));
}

/**
 * The listing's own WhatsApp number, else its phone when that is a mobile.
 * Digits only, ready for wa.me.
 */
export function whatsappNumberFor(listing: {
  whatsapp?: string | null;
  phone?: string | null;
  countryCode?: string | null;
}): string | null {
  const own = internationalDigits(listing.whatsapp, listing.countryCode);
  if (own) return own;
  const phone = internationalDigits(listing.phone, listing.countryCode);
  return phone && isEastAfricanMobile(phone) ? phone : null;
}

/** Where a chat was started, recorded with each one. */
export const WHATSAPP_SOURCES = ['card', 'profile', 'package', 'enquiry'] as const;
export type WhatsAppSource = (typeof WHATSAPP_SOURCES)[number];

/**
 * The tracked link. The route records the chat as a contact for the operator,
 * then sends the traveller on to WhatsApp with a message already written.
 */
export function whatsappHref(
  businessId: string,
  from: WhatsAppSource,
  locale: string,
  about: { reference?: string; packageSlug?: string } = {},
): string {
  const q = new URLSearchParams({ from, lang: locale });
  if (about.reference) q.set('ref', about.reference);
  if (about.packageSlug) q.set('package', about.packageSlug);
  return `/api/whatsapp/${businessId}?${q.toString()}`;
}
