import { createClient } from '@/lib/supabase/server';
import { renderBookingPdf } from '@/lib/bookings/pdf';
import { bookingDocLabels, bookingFilename, toBookingDoc } from '@/lib/bookings/load';

/**
 * A booking's trip document, as a PDF.
 *
 * Read through the signed-in visitor's own client, so the database decides
 * who may have it (bookings_read, migration 097): the traveller who booked,
 * the operator's owner, and admins. Anyone else, signed in or not, gets 404,
 * which does not confirm the reference exists. Rendered fresh from the frozen
 * booking row each time; nothing is stored.
 */
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  if (!/^BK-\d{4}-\d{6}$/.test(reference)) return new Response('Not found', { status: 404 });

  const supabase = await createClient();
  const { data: row } = await supabase.from('bookings').select('*').eq('reference', reference).maybeSingle();
  if (!row) return new Response('Not found', { status: 404 });

  const doc = toBookingDoc(row);
  const pdf = await renderBookingPdf(doc, await bookingDocLabels(doc.locale));
  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${bookingFilename(reference)}"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
