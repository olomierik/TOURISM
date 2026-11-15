/**
 * When `contact_clicks` began meaning "a chat by someone who was on the site".
 *
 * Before migration 073 the WhatsApp redirect counted any request that was not
 * caught by the agent blocklist. Measured over the 30 days to this date: 839
 * chats against 246 page views, 787 of them from identities that loaded no
 * pages at all. Those rows are kept — they are a true record of requests that
 * arrived — but they are not contacts, and nothing may show them to an
 * operator as though they were.
 *
 * Every read of `contact_clicks` meant for a person starts here: the owner
 * dashboard, the admin contact list and the contact-report emails.
 *
 * Its own plain module, with no server-only import, so the node scripts that
 * stage those emails read the same date as the app. On 14 November 2026 a
 * count that skipped this floor put 805 "taps" behind a draft email; the real
 * number since this date was 1.
 */
export const CONTACT_CLICKS_TRUSTED_FROM = new Date('2026-11-08T00:00:00Z');

/**
 * Where a window of `days` ending now really starts: never before the date the
 * count became trustworthy. Returns the start and the whole days it covers, so
 * a message can say "in the last 7 days" rather than claim thirty.
 */
export function trustedWindow(days: number, now = new Date()): { since: Date; days: number } {
  const asked = new Date(now.getTime() - days * 86_400_000);
  const since = asked > CONTACT_CLICKS_TRUSTED_FROM ? asked : CONTACT_CLICKS_TRUSTED_FROM;
  return { since, days: Math.max(1, Math.ceil((now.getTime() - since.getTime()) / 86_400_000)) };
}
