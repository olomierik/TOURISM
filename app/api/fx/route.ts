/**
 * Daily exchange rates for the "≈ €1,234" shown beside prices (SEO brief
 * T16). Prices are always quoted in the operator's own currency; this only
 * powers the approximate conversion a traveller can choose to see.
 *
 * From open.er-api.com (free, no key, includes the Tanzanian shilling),
 * fetched at most once a day and cached by the CDN for a day. No visitor data
 * is sent anywhere: the server asks for one public table. If the source is
 * down, the answer is null and the page simply shows no conversion.
 */
// Dynamic, so a failed fetch is never frozen into a day-long cached null;
// the upstream table itself is cached for a day by fetch's own cache.
export const dynamic = 'force-dynamic';

const WANTED = ['EUR', 'GBP', 'TZS', 'KES'] as const;

export async function GET() {
  let body: { base: 'USD'; asOf: string; rates: Record<string, number> } | null = null;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 86400 } });
    if (res.ok) {
      const json = (await res.json()) as { result?: string; time_last_update_utc?: string; rates?: Record<string, number> };
      if (json.result === 'success' && json.rates) {
        const rates: Record<string, number> = { USD: 1 };
        for (const c of WANTED) if (typeof json.rates[c] === 'number') rates[c] = json.rates[c];
        body = { base: 'USD', asOf: json.time_last_update_utc ?? new Date().toUTCString(), rates };
      }
    }
  } catch {
    body = null;
  }
  return Response.json(body, {
    headers: {
      'Cache-Control': body
        ? 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400'
        : 'no-store',
    },
  });
}
