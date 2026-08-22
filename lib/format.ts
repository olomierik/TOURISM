import type { Locale } from '@/i18n/routing';

/**
 * Money formatting.
 *
 * Operators quote in USD almost universally, but a German traveler reading
 * "$3,450" has to do mental arithmetic before the number means anything. Prices
 * are stored once in the operator's currency and formatted for the reader's
 * locale, so a French visitor sees "3 450 $US" with their own separators.
 *
 * Fractional cents are dropped: safari pricing is quoted in round hundreds and
 * ".00" on every card is visual noise.
 */
export function formatPrice(amount: number, currency: string, locale: Locale | string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number, locale: Locale | string) {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDate(value: string | Date, locale: Locale | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Builds a wa.me deep link.
 *
 * WhatsApp is the dominant business channel in Tanzania — for many operators it
 * is the only one answered reliably — so a working link here converts better
 * than an email address. wa.me requires digits only: no +, spaces or dashes.
 */
export function whatsappLink(number: string, message?: string) {
  const digits = number.replace(/\D/g, '');
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
