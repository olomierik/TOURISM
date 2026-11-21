import 'server-only';

import { cache } from 'react';

import { allowIndexing } from '@/lib/seo';
import { createPublicClient } from '@/lib/supabase/public';
import { withMarkup } from '@/lib/pricing/markup';

/**
 * The Tanzania Safari Price Index (SEO brief T11): what a safari day costs,
 * park by park, from data this site holds, with the sample behind every
 * number on show.
 *
 * Three sources, kept apart because they mean different things:
 *
 *   tours      operators' published tour prices, per person per day, at the
 *              price shown on the site (operator rate plus marketing margin)
 *   day rates  operators' published day rates for the parks they serve
 *   estimates  the editorial cost bands on each park page (budget, mid-range,
 *              luxury); researched, not observed
 *
 * Traveller budgets from quote requests are left out until a park has at
 * least MIN_QUOTES of them. On 21 Nov 2026 there were six requests in all,
 * two with a budget: a median of two people is not an index, and it would
 * come close to publishing what those two people told us in confidence.
 *
 * There is no season split: no source here is dated by travel month yet, and
 * the page says so rather than inventing one.
 *
 * Draft until the owner approves it (PUBLISHED below): visible where indexing
 * is off (local, previews), a 404 in production, including the CSV and embed.
 */
export const PUBLISHED = true;
export const indexVisible = PUBLISHED || !allowIndexing;

/** A median shown with fewer than this many prices reads "not enough data". */
export const MIN_SAMPLE = 3;
export const MIN_QUOTES = 10;

export type IndexRow = {
  park: string;
  slug: string;
  tours: { median: number | null; n: number };
  dayRates: { median: number | null; n: number };
  estimate: {
    budget: [number, number] | null;
    midrange: [number, number] | null;
    luxury: [number, number] | null;
    parkFees: [number, number] | null;
  };
};

const median = (xs: number[]): number | null => {
  if (xs.length < MIN_SAMPLE) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
};

const band = (lo: number | null, hi: number | null): [number, number] | null =>
  lo != null && hi != null ? [Number(lo), Number(hi)] : null;

export const getPriceIndex = cache(async (): Promise<{ rows: IndexRow[]; asOf: string; totals: { tours: number; operators: number } }> => {
  const supabase = createPublicClient();

  const [{ data: costs }, { data: pkgs }, { data: biz }] = await Promise.all([
    supabase
      .from('destination_costs')
      .select(
        `budget_low, budget_high, midrange_low, midrange_high, luxury_low, luxury_high, park_fee_low, park_fee_high,
         destinations!inner (id, country_code, is_active, destination_translations!inner (locale, name, slug))`,
      )
      .eq('destinations.country_code', 'TZ')
      .eq('destinations.is_active', true)
      .eq('destinations.destination_translations.locale', 'en')
      .not('park_fee_low', 'is', null),
    supabase
      .from('packages')
      .select(
        'price_from, price_unit, duration_days, package_destinations (destination_id), businesses!inner (status, rate_markup_opt_out)',
      )
      .eq('status', 'published')
      .is('deleted_at', null)
      .eq('businesses.status', 'approved')
      .not('price_from', 'is', null),
    supabase
      .from('businesses')
      .select('day_rate_low, rate_markup_opt_out, business_destinations (destination_id)')
      .eq('status', 'approved')
      .is('deleted_at', null)
      .not('day_rate_low', 'is', null),
  ]);

  type Dest = { id: string; destination_translations: { name: string; slug: string }[] };

  const rows: IndexRow[] = (costs ?? []).map((c) => {
    const d = c.destinations as unknown as Dest;
    const tourPrices = (pkgs ?? [])
      .filter((p) => p.price_unit === 'per_person' && (p.duration_days ?? 0) > 0)
      .filter((p) => p.package_destinations.some((pd) => pd.destination_id === d.id))
      .map((p) => {
        const optOut = (p.businesses as unknown as { rate_markup_opt_out: boolean }).rate_markup_opt_out;
        return (withMarkup(p.price_from, optOut) ?? 0) / (p.duration_days as number);
      });
    const dayRates = (biz ?? [])
      .filter((b) => b.business_destinations.some((bd) => bd.destination_id === d.id))
      .map((b) => withMarkup(b.day_rate_low, b.rate_markup_opt_out) ?? 0)
      .filter((n) => n > 0);
    return {
      park: d.destination_translations[0].name,
      slug: d.destination_translations[0].slug,
      tours: { median: median(tourPrices), n: tourPrices.length },
      dayRates: { median: median(dayRates), n: dayRates.length },
      estimate: {
        budget: band(c.budget_low, c.budget_high),
        midrange: band(c.midrange_low, c.midrange_high),
        luxury: band(c.luxury_low, c.luxury_high),
        parkFees: band(c.park_fee_low, c.park_fee_high),
      },
    };
  });

  rows.sort((a, b) => (b.estimate.midrange?.[1] ?? 0) - (a.estimate.midrange?.[1] ?? 0));

  return {
    rows,
    asOf: new Date().toISOString().slice(0, 10),
    totals: { tours: (pkgs ?? []).length, operators: (biz ?? []).length },
  };
});

/** The index as CSV, for the download and for anyone citing it. */
export function toCsv(rows: IndexRow[], asOf: string): string {
  const cell = (v: string | number | null) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`);
  const range = (r: [number, number] | null) => (r ? `${r[0]}-${r[1]}` : '');
  const head = [
    'park',
    'tours_median_usd_per_person_per_day',
    'tours_sample',
    'day_rates_median_usd',
    'day_rates_sample',
    'estimate_budget_usd',
    'estimate_midrange_usd',
    'estimate_luxury_usd',
    'park_fees_usd',
    'as_of',
    'source',
  ];
  const lines = rows.map((r) =>
    [
      r.park,
      r.tours.median,
      r.tours.n,
      r.dayRates.median,
      r.dayRates.n,
      range(r.estimate.budget),
      range(r.estimate.midrange),
      range(r.estimate.luxury),
      range(r.estimate.parkFees),
      asOf,
      'ExploreTanzania.online Safari Price Index',
    ]
      .map(cell)
      .join(','),
  );
  return [head.join(','), ...lines].join('\n') + '\n';
}
