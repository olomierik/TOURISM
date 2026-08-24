import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';

/**
 * Listing performance for the owner dashboard.
 *
 * Wrapped in cache() so the window is computed once per request. Reading the
 * clock during a component's render is flagged as impure for good reason: a
 * re-render would move the window underneath the numbers already on screen, and
 * two tiles could end up describing different periods.
 */
export const getListingAnalytics = cache(async (businessId: string) => {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 864e5);
  const sinceIso = since.toISOString();

  const [{ data: views }, { data: leads }] = await Promise.all([
    supabase
      .from('page_views')
      .select('created_at, referrer, visitor_hash')
      .eq('business_id', businessId)
      .gte('created_at', sinceIso),
    supabase
      .from('lead_businesses')
      .select('id, status, created_at')
      .eq('business_id', businessId)
      .gte('created_at', sinceIso),
  ]);

  const viewRows = views ?? [];
  const leadRows = leads ?? [];

  // Thirty buckets, pre-seeded to zero so quiet days render as gaps rather than
  // being silently dropped and compressing the chart.
  const days = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(since.getTime() + (29 - i) * 864e5);
    days.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of viewRows) {
    const key = r.created_at.slice(0, 10);
    if (days.has(key)) days.set(key, (days.get(key) ?? 0) + 1);
  }

  const referrers = [
    ...viewRows.reduce((m, v) => {
      if (!v.referrer) return m;
      try {
        const host = new URL(v.referrer).hostname.replace(/^www\./, '');
        m.set(host, (m.get(host) ?? 0) + 1);
      } catch {
        // A referrer that is not a URL tells us nothing; drop it rather than
        // rendering a broken row.
      }
      return m;
    }, new Map<string, number>()),
  ]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    views: viewRows.length,
    visitors: new Set(viewRows.map((v) => v.visitor_hash).filter(Boolean)).size,
    enquiries: leadRows.length,
    // Null rather than zero when there is nothing to divide by: "0%" reads as a
    // measured failure, when in fact nothing has been measured.
    conversion: viewRows.length
      ? ((leadRows.length / viewRows.length) * 100).toFixed(1)
      : null,
    daily: [...days.entries()],
    referrers,
  };
});
