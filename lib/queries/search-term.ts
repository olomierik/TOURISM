/**
 * Strips diacritics from a search term.
 *
 * The stored search vectors are unaccented (migration 016), and PostgREST's
 * textSearch calls websearch_to_tsquery directly rather than going through the
 * database's build_search_query helper — so the query has to be folded here or
 * the two sides never meet. Searching "plongée" and "plongee" must both work.
 *
 * NFD splits accented characters into base + combining mark; removing the marks
 * leaves the base letter.
 */
export function normalizeSearchTerm(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}
