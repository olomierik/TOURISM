import { cache } from 'react';

import { createPublicClient } from '@/lib/supabase/public';

/**
 * The administrative regions a visitor can filter by.
 *
 * The regions table has existed since the site went multi-country, holding
 * Tanzania's 31 regions, Kenya's 47 counties, Uganda's 4 regions and Rwanda's
 * 5 provinces. Until 056 nothing was filed under any of them, so the only
 * geography the directory offered was a destination — which is a park or a
 * town, not a place a business registers in — and near-me, which needs a
 * browser to hand over a location first.
 */

export type RegionOption = {
  id: string;
  slug: string;
  name: string;
  countryCode: string;
};

export type RegionGroup = {
  countryCode: string;
  countryName: string;
  regions: RegionOption[];
};

/**
 * Regions grouped under their country, in the order the countries are curated.
 *
 * Grouped rather than flat because a flat list of 87 is unreadable, and because
 * 'Western' means one thing in Uganda and another in Rwanda — the country
 * heading is what makes the option unambiguous to read, even though the slug
 * is unique enough to be unambiguous to the server.
 */
export const getRegionsByCountry = cache(async (): Promise<RegionGroup[]> => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('regions')
    .select('id, slug, name, country_code, sort_order, countries!inner (code, name, sort_order)')
    .order('name');

  if (error) throw new Error(`getRegionsByCountry: ${error.message}`);

  const grouped = new Map<string, RegionGroup & { sort: number }>();

  for (const row of data ?? []) {
    const country = row.countries as unknown as { code: string; name: string; sort_order: number };
    if (!country) continue;

    const entry = grouped.get(country.code) ?? {
      countryCode: country.code,
      countryName: country.name,
      sort: country.sort_order,
      regions: [],
    };
    entry.regions.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      countryCode: row.country_code,
    });
    grouped.set(country.code, entry);
  }

  return [...grouped.values()]
    .sort((a, b) => a.sort - b.sort || a.countryName.localeCompare(b.countryName))
    .map(({ countryCode, countryName, regions }) => ({ countryCode, countryName, regions }));
});
