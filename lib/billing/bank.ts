/**
 * Where subscription payments go.
 *
 * One place, because an account number that appears in three components is an
 * account number that will one day be right in two of them. If this changes,
 * it changes here and nowhere else.
 *
 * These details are published on a page any signed-in operator can reach, which
 * is ordinary for a business invoicing another business — but it does mean two
 * things are worth knowing. Anyone who sees the page can quote the account back
 * at somebody else, so an operator being asked to pay a *different* account
 * should treat that as fraud; the page says so. And a transfer arrives in a
 * bank statement rather than a webhook, so no plan activates on its own — an
 * admin matches the reference against the statement and grants it.
 */

export const BANK_DETAILS = {
  bankName: 'CRDB Bank',
  accountName: 'ERICK ELIBARIKI OLOMI',
  accountNumber: '0152838359500',
  country: 'Tanzania',
} as const;

/**
 * How we can be reached, and the numbers on the contact page.
 *
 * WhatsApp takes the international form with no punctuation, because that is
 * what wa.me requires — a link built from the display form silently 404s.
 */
export const CONTACT_DETAILS = {
  phoneDisplay: '+255 752 401 012',
  /** E.164, for tel: and wa.me links. */
  phoneE164: '+255752401012',
  whatsapp: '255752401012',
  weChat: '+255752401012',
  email: 'listings@exploretanzania.online',
} as const;

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${CONTACT_DETAILS.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
