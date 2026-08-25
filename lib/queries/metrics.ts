import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import { locales, type Locale } from '@/i18n/routing';
import { fetchAllRows } from './paginate';

/**
 * The flywheel, measured.
 *
 * What a buyer or an investor is underwriting is not a product, it is a chain:
 * listings bring traffic, traffic brings enquiries, enquiries convert operators
 * to paid. Small absolute numbers are fine — an intact chain that extrapolates
 * is a story, and a polished product with unmeasured everything is not.
 *
 * Traffic by language market is the one to watch. The whole strategy is that
 * German, French and Italian search for East Africa is thin enough to win, and
 * this is where that either shows up or does not. If German traffic per German
 * page beats English traffic per English page, the thesis holds.
 *
 * Everything reads through the cookie-bound client, so RLS applies and only an
 * admin can see any of it — page_views is admin-read, by policy.
 */

const DAY = 864e5;

export type MetricsWindow = 30 | 90;

export type PlatformMetrics = {
  windowDays: number;

  supply: {
    total: number;
    claimed: number;
    unclaimed: number;
    pendingClaims: number;
    byCountry: Array<{ code: string; count: number }>;
    byTier: Array<{ tier: string; count: number }>;
  };

  demand: {
    views: number;
    visitors: number;
    byLocale: Array<{ locale: Locale; views: number; visitors: number; pages: number }>;
    topReferrers: Array<{ host: string; count: number }>;
    topPages: Array<{ path: string; views: number }>;
  };

  conversion: {
    leads: number;
    distributions: number;
    respondedDistributions: number;
    responseRate: number | null;
    /** Enquiries per hundred views — the number that has to move for any of this to work. */
    leadsPerHundredViews: number | null;
  };

  revenue: {
    activeSubscriptions: number;
    payingOperators: number;
    mrrUsd: number;
    freeToPaid: number | null;
  };
};

export const getPlatformMetrics = cache(
  async (windowDays: MetricsWindow = 30): Promise<PlatformMetrics> => {
    const supabase = await createClient();
    const since = new Date(Date.now() - windowDays * DAY).toISOString();

    const [
      businesses,
      claims,
      views,
      leads,
      distributions,
      subscriptions,
      guideCounts,
    ] = await Promise.all([
      // Paged. Counting 1,000 of 1,344 listings and calling it the total is the
      // one thing a metrics page must never do.
      fetchAllRows(
        (from, to) =>
          supabase
            .from('businesses')
            .select('id, tier, country_code, owner_id')
            .eq('status', 'approved')
            .is('deleted_at', null)
            .order('id')
            .range(from, to),
        'metrics.businesses',
      ).then((rows) => ({ data: rows, error: null })),
      supabase.from('business_claims').select('id').eq('status', 'pending'),
      fetchAllRows(
        (from, to) =>
          supabase
            .from('page_views')
            .select('path, locale, visitor_hash, referrer, created_at')
            .gte('created_at', since)
            .order('created_at')
            .range(from, to),
        'metrics.pageViews',
      ).then((rows) => ({ data: rows, error: null })),
      supabase.from('leads').select('id').gte('created_at', since),
      supabase.from('lead_businesses').select('id, status').gte('created_at', since),
      supabase
        .from('subscriptions')
        .select('id, business_id, status, subscription_plans (key, price_monthly)')
        .eq('status', 'active'),
      // Pages per locale is the denominator that makes traffic comparable: German
      // has more than twice English's guide count, so raw view totals would
      // flatter it and prove nothing about the wedge.
      supabase
        .from('guide_translations')
        .select('locale, guides!inner (status, deleted_at)')
        .eq('guides.status', 'published')
        .is('guides.deleted_at', null),
    ]);

    const bizRows = businesses.data ?? [];
    const viewRows = views.data ?? [];
    const distRows = distributions.data ?? [];

    const countBy = <T, K extends string>(rows: T[], key: (row: T) => K | null) => {
      const m = new Map<K, number>();
      for (const r of rows) {
        const k = key(r);
        if (k === null) continue;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return m;
    };

    const pagesByLocale = countBy(
      guideCounts.data ?? [],
      (g) => g.locale as Locale,
    );

    const byLocale = locales.map((locale) => {
      const rows = viewRows.filter((v) => v.locale === locale);
      return {
        locale,
        views: rows.length,
        visitors: new Set(rows.map((v) => v.visitor_hash).filter(Boolean)).size,
        pages: pagesByLocale.get(locale) ?? 0,
      };
    });

    const referrers = [
      ...viewRows.reduce((m, v) => {
        if (!v.referrer) return m;
        try {
          const host = new URL(v.referrer).hostname.replace(/^www\./, '');
          m.set(host, (m.get(host) ?? 0) + 1);
        } catch {
          // Not a URL, so it names nowhere. Dropped rather than rendered.
        }
        return m;
      }, new Map<string, number>()),
    ]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([host, count]) => ({ host, count }));

    const topPages = [...countBy(viewRows, (v) => v.path).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, views]) => ({ path, views }));

    const claimed = bizRows.filter((b) => b.owner_id !== null).length;

    // "Responded" is any distribution the operator has moved past sent. It is the
    // number that feeds lead ranking, so it is also the number operators are
    // implicitly competing on.
    const responded = distRows.filter((d) => d.status && d.status !== 'sent').length;

    const subRows = (subscriptions.data ?? []) as Array<{
      business_id: string;
      subscription_plans: { key: string; price_monthly: number | string } | null;
    }>;

    const paying = subRows.filter(
      (s) => Number(s.subscription_plans?.price_monthly ?? 0) > 0,
    );
    const mrrUsd = paying.reduce(
      (sum, s) => sum + Number(s.subscription_plans?.price_monthly ?? 0),
      0,
    );

    return {
      windowDays,

      supply: {
        total: bizRows.length,
        claimed,
        unclaimed: bizRows.length - claimed,
        pendingClaims: (claims.data ?? []).length,
        byCountry: [...countBy(bizRows, (b) => b.country_code).entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([code, count]) => ({ code, count })),
        byTier: [...countBy(bizRows, (b) => b.tier).entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([tier, count]) => ({ tier, count })),
      },

      demand: {
        views: viewRows.length,
        visitors: new Set(viewRows.map((v) => v.visitor_hash).filter(Boolean)).size,
        byLocale,
        topReferrers: referrers,
        topPages,
      },

      conversion: {
        leads: (leads.data ?? []).length,
        distributions: distRows.length,
        respondedDistributions: responded,
        responseRate: distRows.length ? (responded / distRows.length) * 100 : null,
        // Null rather than zero when nothing has been measured. "0%" reads as a
        // tested failure; no data is not the same claim.
        leadsPerHundredViews: viewRows.length
          ? ((leads.data ?? []).length / viewRows.length) * 100
          : null,
      },

      revenue: {
        activeSubscriptions: subRows.length,
        payingOperators: paying.length,
        mrrUsd,
        freeToPaid: bizRows.length ? (paying.length / bizRows.length) * 100 : null,
      },
    };
  },
);
