import { cache } from 'react';

import { createPublicClient } from '@/lib/supabase/public';

/**
 * Country and region reference data.
 *
 * Read through the public client so pages that use it stay statically
 * generated — this is public reference data with no per-user variation, and
 * putting it behind the cookie-bound client would make the homepage dynamic.
 */

/** Countries we publish destinations for. */
export const getCuratedCountries = cache(async () => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('countries')
    .select('code, name')
    .eq('supports_destinations', true)
    .order('sort_order');

  if (error) throw new Error(`getCuratedCountries: ${error.message}`);
  return data ?? [];
});

/** Every country an operator may list a business in. */
export const getAllCountries = cache(async () => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('countries')
    .select('code, name')
    .order('sort_order')
    .order('name');

  if (error) throw new Error(`getAllCountries: ${error.message}`);
  return data ?? [];
});

/** Regions of the curated countries, for the destination picker. */
export const getRegions = cache(async () => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('regions')
    .select('id, country_code, name')
    .order('country_code')
    .order('name');

  if (error) throw new Error(`getRegions: ${error.message}`);
  return data ?? [];
});
