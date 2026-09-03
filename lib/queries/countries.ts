import { cache } from 'react';

import { createPublicClient } from '@/lib/supabase/public';
import { fetchAllRows } from '@/lib/queries/paginate';

/**
 * Which countries this site actually covers.
 *
 * Read from the database rather than kept as a constant because the answer
 * changes by seed, not by deploy: Rwanda went from zero destinations to four
 * without a code change, and a hardcoded list would have kept saying Tanzania,
 * Kenya and Uganda until someone noticed.
 *
 * This feeds structured data and llms.txt, which are the two places a wrong
 * answer is most expensive — a crawler that reads "areaServed: Tanzania" will
 * not consider this site for a Rwanda question, and models cache.
 */

export type CoveredCountry = {
  code: string;
  name: string;
  destinationCount: number;
};

export type CountryWithBusinesses = CoveredCountry & { businessCount: number };

/**
 * Countries with at least one live destination, in curation order.
 *
 * `supports_destinations` is not the test. That flag records editorial intent —
 * Rwanda carried it for weeks with nothing behind it — and advertising coverage
 * of a country whose every page is empty is the thin-content signal the sitemap
 * already goes out of its way to avoid.
 */
export const getCoveredCountries = cache(async (): Promise<CoveredCountry[]> => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('destinations')
    .select('country_code, countries!inner (code, name, sort_order)')
    .eq('is_active', true)
    .is('deleted_at', null);

  if (error) throw new Error(`getCoveredCountries: ${error.message}`);

  const byCode = new Map<string, CoveredCountry & { sort: number }>();

  for (const row of data ?? []) {
    const c = row.countries as unknown as { code: string; name: string; sort_order: number };
    if (!c) continue;
    const entry = byCode.get(c.code) ?? {
      code: c.code,
      name: c.name,
      destinationCount: 0,
      sort: c.sort_order,
    };
    entry.destinationCount++;
    byCode.set(c.code, entry);
  }

  return [...byCode.values()]
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
    .map(({ code, name, destinationCount }) => ({ code, name, destinationCount }));
});

/**
 * Destinations grouped under their country, in curation order.
 *
 * llms.txt used to list all 46 as one flat bulleted run. A model reading that
 * has to infer the geography from the names, and it will get Kigali wrong.
 * Grouping states it outright, which is the whole job of the file.
 */
export const getDestinationsByCountry = cache(
  async (
    locale: string,
  ): Promise<Array<{ country: string; places: Array<{ name: string; slug: string; summary: string | null }> }>> => {
    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from('destinations')
      .select(
        `sort_order,
         countries!inner (code, name, sort_order),
         destination_translations!inner (locale, name, slug, summary)`,
      )
      .eq('destination_translations.locale', locale)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order');

    if (error) throw new Error(`getDestinationsByCountry: ${error.message}`);

    const grouped = new Map<
      string,
      { country: string; sort: number; places: Array<{ name: string; slug: string; summary: string | null }> }
    >();

    for (const row of data ?? []) {
      const c = row.countries as unknown as { code: string; name: string; sort_order: number };
      const t = (row.destination_translations as unknown as Array<{
        name: string;
        slug: string;
        summary: string | null;
      }>)[0];
      if (!c || !t) continue;

      const entry = grouped.get(c.code) ?? { country: c.name, sort: c.sort_order, places: [] };
      entry.places.push({ name: t.name, slug: t.slug, summary: t.summary });
      grouped.set(c.code, entry);
    }

    return [...grouped.values()]
      .sort((a, b) => a.sort - b.sort || a.country.localeCompare(b.country))
      .map(({ country, places }) => ({ country, places }));
  },
);

/**
 * "Tanzania, Kenya, Uganda and Rwanda" — for prose that has to name the
 * coverage without going stale the next time a country is added.
 */
export function listCountryNames(countries: CoveredCountry[]): string {
  const names = countries.map((c) => c.name);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Covered countries with how many listings each holds.
 *
 * Separate from getCoveredCountries because the directory needs a different
 * number than the site schema does. A filter reading "Tanzania (15)" when 15 is
 * the destination count tells a visitor they will get 15 businesses and then
 * hands them 242 — a wrong number in a filter is worse than no number.
 */
export const getCountriesWithBusinessCounts = cache(
  async (): Promise<CountryWithBusinesses[]> => {
    const supabase = createPublicClient();
    const countries = await getCoveredCountries();

    const counts = await Promise.all(
      countries.map(async (c) => {
        const { count } = await supabase
          .from('businesses')
          .select('id', { count: 'exact', head: true })
          .eq('country_code', c.code)
          .eq('status', 'approved')
          .is('deleted_at', null);
        return { ...c, businessCount: count ?? 0 };
      }),
    );

    // A country with no listings is a filter that returns an empty page.
    return counts.filter((c) => c.businessCount > 0);
  },
);

/**
 * How many approved listings sit behind each category and each destination.
 *
 * SafariBookings puts a count beside every facet, and it is the clearest signal
 * a filter is worth clicking: "Kenya (635)" tells you the shape of the inventory
 * before you commit to narrowing it. A bare label tells you nothing, and a
 * dropdown hides even the labels until you open it.
 *
 * Counted through business_categories and business_destinations rather than
 * from the listing row, because a business can sit in several of each. Paged,
 * because PostgREST caps an unpaginated select at 1,000 rows and the join tables
 * are larger than the listing table.
 */
export const getFacetCounts = cache(async () => {
  const supabase = createPublicClient();

  const [liveRows, catRows, destRows] = await Promise.all([
    // region_id rides along on a read that already happens. The region counts
    // are a group-by over exactly the rows being fetched here, so asking for
    // one more column costs nothing and a second paged pass over 2,600 rows
    // would have cost a round trip per page for the same answer.
    fetchAllRows<{ id: string; region_id: string | null }>(
      (from, to) =>
        supabase
          .from('businesses')
          .select('id, region_id')
          .eq('status', 'approved')
          .is('deleted_at', null)
          .range(from, to),
      'getFacetCounts:businesses',
    ),
    fetchAllRows<{ business_id: string; category_id: string }>(
      (from, to) =>
        supabase.from('business_categories').select('business_id, category_id').range(from, to),
      'getFacetCounts:categories',
    ),
    fetchAllRows<{ business_id: string; destination_id: string }>(
      (from, to) =>
        supabase
          .from('business_destinations')
          .select('business_id, destination_id')
          .range(from, to),
      'getFacetCounts:destinations',
    ),
  ]);

  // Only approved, undeleted listings count. The join is done here rather than
  // in the database because PostgREST cannot express "count distinct through a
  // join", and a wrong number in a filter is worse than no number at all.
  const liveIds = new Set(liveRows.map((r) => r.id));

  const byCategory = new Map<string, number>();
  for (const r of catRows) {
    if (!liveIds.has(r.business_id)) continue;
    byCategory.set(r.category_id, (byCategory.get(r.category_id) ?? 0) + 1);
  }

  const byDestination = new Map<string, number>();
  for (const r of destRows) {
    if (!liveIds.has(r.business_id)) continue;
    byDestination.set(r.destination_id, (byDestination.get(r.destination_id) ?? 0) + 1);
  }

  // Straight off the listing row: a business sits in exactly one region, so
  // unlike categories and destinations this needs no join and no de-duplication.
  const byRegion = new Map<string, number>();
  for (const r of liveRows) {
    if (!r.region_id) continue;
    byRegion.set(r.region_id, (byRegion.get(r.region_id) ?? 0) + 1);
  }

  return { byCategory, byDestination, byRegion };
});
