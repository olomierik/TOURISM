/**
 * Search-result titles and descriptions by page type (SEO brief T8, 21 Nov
 * 2026).
 *
 * The site was showing up (6,800 impressions in a month) and not being picked
 * (0.5% CTR). A result wins the click by saying something the reader cannot
 * get from the result above it: a number, a price, a year, a reason to trust
 * it. These templates put exactly those first, from the site's own data, and
 * leave the brand to the layout's "| ExploreTanzania.online".
 *
 * English only for now. The brief rules out machine translation of new copy,
 * so German, French and Italian pages keep their editorial titles until a
 * native speaker has reviewed these patterns (i18n-review/*.csv).
 *
 * Every claim here must stay true:
 *   - "Free quotes" — an enquiry costs the traveller nothing.
 *   - "No booking fees" — the site takes no booking and charges travellers
 *     nothing; the price is between them and the operator.
 *   - "local operators" — not "licensed": not every listing is verified.
 * The brief's "within 24 h" is left out: reply time is the operator's, and the
 * site cannot promise it.
 */

export const TRUST_LINE = 'Free quotes · No booking fees · Local operators.';

/** The season people are planning: next year from October on. */
export function planningYear(now = new Date()): number {
  return now.getUTCMonth() >= 9 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
}

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** First sentence of a text, or the whole text if it has none. */
function lead(text: string | null | undefined): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  const m = t.match(/^.{20,}?[.!?](?=\s|$)/);
  return m ? m[0] : t;
}

/**
 * The answer first, then the trust line, inside 160 characters. If the lead
 * is long it is cut at a word boundary and closed with an ellipsis, never
 * mid-word.
 */
export function describe(answer: string | null | undefined, trust = TRUST_LINE, max = 160): string {
  const first = lead(answer);
  const room = max - trust.length - 1;
  if (!first) return trust;
  if (first.length <= room) return `${first} ${trust}`;
  const cut = first.slice(0, room - 1).replace(/\s+\S*$/, '');
  return `${cut}… ${trust}`;
}

export function destinationTitle(input: {
  name: string;
  isPark: boolean;
  operators: number;
  fromPerDay: number | null;
}): string {
  const year = planningYear();
  const base = input.isPark ? `${input.name} Safari Tours ${year}` : `${input.name} Travel Guide ${year}`;
  const parts = [base];
  if (input.operators >= 2) parts.push(`Compare ${input.operators} Local Operators`);
  if (input.fromPerDay) parts.push(`from ${usd(input.fromPerDay)}/day`);
  // "A – B, from $x/day": the price joins the comparison clause with a comma.
  if (parts.length === 3) return `${parts[0]} – ${parts[1]}, ${parts[2]}`;
  return parts.join(' – ');
}

export function packageTitle(input: {
  title: string;
  days: number | null;
  startCity: string | null;
  price: number | null;
}): string {
  const bits: string[] = [];
  if (input.days) bits.push(`${input.days} ${input.days === 1 ? 'Day' : 'Days'}${input.startCity ? ` from ${input.startCity}` : ''}`);
  if (input.price) bits.push(`from ${usd(input.price)}`);
  return bits.length ? `${input.title} – ${bits.join(', ')}` : input.title;
}

/** "Topic (2027)" unless the title already names a year. */
export function guideTitle(title: string): string {
  return /\b20\d\d\b/.test(title) ? title : `${title} (${planningYear()})`;
}
