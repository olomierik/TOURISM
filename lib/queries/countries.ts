import { cache } from 'react';

import { createPublicClient } from '@/lib/supabase/public';

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
