/**
 * Reading a country out of a search box.
 *
 * Searching "tanzania" returned 242 listings, six of them Kenyan — operators in
 * Nairobi whose business name is "Ongeri Expeditions | Luxury Kenya and Tanzania
 * Safaris" or "Dallago Tours Kenya-Tanzania Ltd". The text match is correct and
 * the answer is wrong: somebody who types a country name is naming where they
 * want to go, not asking for every business that mentions the word.
 *
 * The country dropdown always did the right thing. But the homepage search box
 * submits `q` alone, so the most natural first action on the site — type where
 * you are going, press enter — was the one path that produced a mixed list.
 *
 * So a country in the query becomes a country filter, and whatever else was
 * typed stays as the search term: "tanzania safari" narrows to Tanzania and
 * searches for "safari".
 *
 * Two rules keep this from being a trap:
 *
 * An explicit choice in the dropdown always wins. This only fills a gap, it
 * never overrides a decision someone made in the interface.
 *
 * And it is never silent — the directory says what it did and offers a link to
 * search everywhere instead. Quietly returning fewer results than someone asked
 * for is worse than returning too many, because there is nothing on the page to
 * explain where the rest went.
 */

/** Only countries we actually list. "botswana" must not filter to an empty page. */
const COUNTRY_TERMS: Record<string, string> = {
  // Tanzania
  tanzania: 'TZ',
  tansania: 'TZ',
  tanzanie: 'TZ',
  tz: 'TZ',
  // Kenya
  kenya: 'KE',
  kenia: 'KE',
  ke: 'KE',
  // Uganda
  uganda: 'UG',
  ouganda: 'UG',
  ug: 'UG',
  // Rwanda
  rwanda: 'RW',
  ruanda: 'RW',
  rw: 'RW',
};

/**
 * Lowercase, strip accents, collapse punctuation to spaces.
 *
 * "Tanzanie," and "TANSANIA" and "tanzania!" all have to reach the same key, and
 * a French reader typing "Ouganda" should match as readily as "uganda".
 */
function normalize(input: string): string {
  return input
    .normalize('NFD')
    // Combining diacritical marks (U+0300-U+036F), left behind by NFD.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export type CountryIntent = {
  /** ISO-3166 alpha-2 of the country named in the query. */
  code: string;
  /** The word that matched, as typed, for showing the reader what we did. */
  matched: string;
  /** Whatever else was in the box, to search on. Empty when the query was only a country. */
  rest: string;
};

/**
 * Pulls a country out of a query, or returns null.
 *
 * Two-letter codes are only honoured when they are the whole query. "ke" inside
 * a longer phrase is far more likely to be a fragment of a word someone is still
 * typing than a request for Kenya.
 */
export function detectCountryIntent(q: string | undefined | null): CountryIntent | null {
  if (!q) return null;

  const normalized = normalize(q);
  if (!normalized) return null;

  const words = normalized.split(' ');

  const wholeQuery = COUNTRY_TERMS[normalized];
  if (wholeQuery) {
    return { code: wholeQuery, matched: q.trim(), rest: '' };
  }

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    if (word.length < 3) continue; // codes only count as the entire query
    const code = COUNTRY_TERMS[word];
    if (!code) continue;

    const rest = [...words.slice(0, i), ...words.slice(i + 1)].join(' ').trim();
    return { code, matched: word, rest };
  }

  return null;
}
