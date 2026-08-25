/**
 * Reads every row of a query, not the first thousand.
 *
 * PostgREST caps an unpaginated select at 1,000 rows and returns success. There
 * is no error, no warning, and no truncation flag — the array is simply shorter
 * than the table. That was invisible while the directory held a few dozen
 * listings and became a quarter of the data the day it passed a thousand: the
 * sitemap advertised 992 of 1,344 businesses, and the metrics page counted the
 * same 1,000 while reporting them as the total.
 *
 * Anything that reads a table which can grow past a thousand rows has to page,
 * and the only safe assumption is that every table here will.
 */

const PAGE = 1000;

export async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string,
): Promise<T[]> {
  const out: T[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw new Error(`${label}: ${error.message}`);

    const rows = data ?? [];
    out.push(...rows);

    // A short page means the end. A full page might be the end too, in which
    // case the next request returns nothing and the loop stops one round later
    // — cheaper than asking for a count up front on every call.
    if (rows.length < PAGE) break;

    // Runaway guard. Nothing here should approach this, and if it does the
    // caller wants to know rather than page forever.
    if (out.length > 100_000) {
      throw new Error(`${label}: refused to page beyond 100,000 rows`);
    }
  }

  return out;
}
