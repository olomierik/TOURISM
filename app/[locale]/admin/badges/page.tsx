import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';

/** The UTC date `n` days ago, as YYYY-MM-DD. Outside the component: reading the clock is not render. */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return { title: 'Badges installed', robots: { index: false, follow: false } };
}

/**
 * Operators showing the ExploreTanzania.online badge on their own sites (SEO
 * brief T12): the referring sites the badge endpoint has seen, with views in
 * the last 30 days. A site here is a real backlink, and the brief's target is
 * 60 by February and 200 within a year.
 *
 * Not translated, like the rest of the admin console.
 */
export default async function AdminBadgesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const since30 = daysAgo(30);
  const [{ data: referrers }, { data: impressions }] = await Promise.all([
    supabase
      .from('badge_referrers')
      .select('business_id, domain, first_seen, last_seen, hits, businesses (name, slug)')
      .order('last_seen', { ascending: false })
      .limit(500),
    supabase.from('badge_impressions').select('business_id, hits').gte('day', since30).limit(5000),
  ]);

  const views = new Map<string, number>();
  for (const r of impressions ?? []) views.set(r.business_id, (views.get(r.business_id) ?? 0) + r.hits);

  const rows = (referrers ?? []).map((r) => ({
    ...r,
    business: r.businesses as unknown as { name: string; slug: string } | null,
  }));
  const operators = new Set(rows.map((r) => r.business_id)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-heading-xl">Badges installed</h1>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">
          {operators} {operators === 1 ? 'operator shows' : 'operators show'} the badge on {rows.length}{' '}
          {rows.length === 1 ? 'site' : 'sites'}. Each site is a link back to the operator&rsquo;s listing.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border bg-surface p-8 text-center text-muted-foreground">
          No badge has been seen on another site yet. Operators find the code on their dashboard home.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[40rem] text-left text-body-sm [&_td]:border-t [&_td]:px-3 [&_td]:py-2 [&_th]:bg-surface-muted [&_th]:px-3 [&_th]:py-2">
            <thead>
              <tr>
                <th>Operator</th>
                <th>Site</th>
                <th>Views (30 days)</th>
                <th>First seen</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => (
                <tr key={`${r.business_id}-${r.domain}`}>
                  <td>
                    {r.business ? (
                      <a href={`/business/${r.business.slug}`} target="_blank" rel="noreferrer" className="font-medium hover:text-primary">
                        {r.business.name}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <a href={`https://${r.domain}`} target="_blank" rel="noreferrer nofollow" className="hover:text-primary">
                      {r.domain}
                    </a>
                  </td>
                  <td>{views.get(r.business_id) ?? 0}</td>
                  <td>{r.first_seen.slice(0, 10)}</td>
                  <td>{r.last_seen.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
