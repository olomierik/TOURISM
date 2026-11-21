import { getPriceIndex, indexVisible, toCsv } from '@/lib/price-index';

/** The Safari Price Index as CSV (SEO brief T11). A 404 while the index is a draft. */
export const revalidate = 86400;

export async function GET() {
  if (!indexVisible) return new Response('Not found', { status: 404 });
  const { rows, asOf } = await getPriceIndex();
  return new Response(toCsv(rows, asOf), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tanzania-safari-price-index-${asOf}.csv"`,
    },
  });
}
