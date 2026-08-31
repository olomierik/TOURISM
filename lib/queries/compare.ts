import { cache } from 'react';

import { createPublicClient } from '@/lib/supabase/public';

/**
 * The rows a comparison table needs, which the directory card does not carry.
 *
 * A card shows what makes somebody click. A comparison shows what makes them
 * choose, and those are different columns: how many destinations an operator
 * actually covers, how many packages they have published, what year they
 * started. Fetching them here rather than widening BusinessCard keeps the cost
 * on the one page that needs it instead of on every listing in the directory.
 *
 * Order follows the slugs the visitor put in the URL. Re-sorting a comparison
 * by rating would quietly answer the question the table is meant to let them
 * answer themselves.
 */
export type ComparableBusiness = {
  id: string;
  slug: string;
  name: string;
  foundedYear: number | null;
  ratingAvg: number | null;
  reviewCount: number;
  avgResponseMinutes: number | null;
  dayRateLow: number | null;
  dayRateHigh: number | null;
  dayRateCurrency: string;
  destinationCount: number;
  packageCount: number;
};

export const getComparableBySlugs = cache(
  async (slugs: string[]): Promise<ComparableBusiness[]> => {
    if (slugs.length === 0) return [];

    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from('businesses')
      .select(
        `id, slug, name, founded_year, rating_avg, rating_count,
         avg_response_minutes, day_rate_low, day_rate_high, day_rate_currency,
         business_destinations (destination_id),
         packages (id, status, deleted_at)`,
      )
      .in('slug', slugs)
      .eq('status', 'approved')
      .is('deleted_at', null);

    if (error) throw new Error(`getComparableBySlugs: ${error.message}`);

    const bySlug = new Map(
      (data ?? []).map((b) => {
        const packages = (b.packages ?? []) as Array<{
          status: string;
          deleted_at: string | null;
        }>;
        return [
          b.slug,
          {
            id: b.id,
            slug: b.slug,
            name: b.name,
            foundedYear: b.founded_year,
            ratingAvg: b.rating_avg === null ? null : Number(b.rating_avg),
            reviewCount: b.rating_count ?? 0,
            avgResponseMinutes: b.avg_response_minutes,
            dayRateLow: b.day_rate_low === null ? null : Number(b.day_rate_low),
            dayRateHigh: b.day_rate_high === null ? null : Number(b.day_rate_high),
            dayRateCurrency: b.day_rate_currency,
            destinationCount: (b.business_destinations ?? []).length,
            packageCount: packages.filter(
              (p) => p.status === 'published' && p.deleted_at === null,
            ).length,
          } satisfies ComparableBusiness,
        ];
      }),
    );

    // The visitor's order, with anything unresolvable dropped rather than
    // rendered as an empty column.
    return slugs
      .map((slug) => bySlug.get(slug))
      .filter((b): b is ComparableBusiness => b !== undefined);
  },
);
