import { cache } from 'react';

import { createPublicClient } from '@/lib/supabase/public';

/**
 * Counts for the about page.
 *
 * Read at render time so the numbers on that page cannot drift from the
 * database. "Over 1,000 operators" typed into copy is a claim nobody remembers
 * to revise; it is still there when the number is 40, or 12,000, and by then
 * the page is lying about the one thing it exists to establish.
 *
 * Includes the counts that do not flatter — how many listings are unclaimed,
 * how many are verified — because a directory quoting only the impressive half
 * of its own statistics is asking to be trusted on everything else for no
 * reason.
 *
 * Written out one query at a time rather than through a helper: the generated
 * Supabase types narrow the select column per table, so a shared wrapper buys
 * six fewer lines and loses the type checking that makes them correct.
 */
export type SiteFacts = {
  operators: number;
  claimed: number;
  verified: number;
  destinations: number;
  guides: number;
  seasonality: number;
};

export const getSiteFacts = cache(async (): Promise<SiteFacts> => {
  const supabase = createPublicClient();
  const head = { count: 'exact' as const, head: true };

  const [operators, claimed, verified, destinations, guides, seasonality] = await Promise.all([
    supabase
      .from('businesses')
      .select('id', head)
      .eq('status', 'approved')
      .is('deleted_at', null),
    supabase
      .from('businesses')
      .select('id', head)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .not('owner_id', 'is', null),
    supabase
      .from('businesses')
      .select('id', head)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .not('verified_at', 'is', null),
    supabase
      .from('destinations')
      .select('id', head)
      .eq('is_active', true)
      .is('deleted_at', null),
    supabase.from('guides').select('id', head).eq('status', 'published'),
    supabase.from('destination_seasonality').select('id', head),
  ]);

  return {
    operators: operators.count ?? 0,
    claimed: claimed.count ?? 0,
    verified: verified.count ?? 0,
    destinations: destinations.count ?? 0,
    guides: guides.count ?? 0,
    seasonality: seasonality.count ?? 0,
  };
});
