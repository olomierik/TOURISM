import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { CalendarCheck, FileDown } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/leads/quote-types';
import { toBookingDoc } from '@/lib/bookings/load';
import { Badge } from '@/components/ui/badge';

/**
 * Every booked trip, newest first, each with its trip document.
 *
 * The owner asked for a copy of every booking, downloadable as a PDF. The
 * copy is the bookings row itself, frozen when the traveller pressed BOOKED;
 * the PDF is drawn from it on download, so this page and the emails always
 * show the same document. Read through the admin's own session: the
 * database's bookings_read policy lets admins see all of them.
 */
export default async function AdminBookingsPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const [{ data: rows }, t, format] = await Promise.all([
    supabase.from('bookings').select('*').order('booked_at', { ascending: false }).limit(500),
    getTranslations('admin'),
    getFormatter(),
  ]);
  const bookings = (rows ?? []).map((r) => ({ row: r, doc: toBookingDoc(r) }));

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <CalendarCheck className="size-6 text-primary" aria-hidden />
        {t('bookingsTitle')}
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('bookingsHint')}</p>

      {bookings.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t('bookingsEmpty')}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t('bookingsRef')}</th>
                <th className="px-3 py-2">{t('bookingsBooked')}</th>
                <th className="px-3 py-2">{t('bookingsTraveller')}</th>
                <th className="px-3 py-2">{t('bookingsOperator')}</th>
                <th className="px-3 py-2">{t('bookingsTrip')}</th>
                <th className="px-3 py-2 text-right">{t('bookingsPrice')}</th>
                <th className="px-3 py-2">{t('bookingsPdf')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.map(({ row, doc }) => (
                <tr key={row.id} className="align-top">
                  <td className="px-3 py-2 font-mono text-xs">
                    {doc.reference}
                    <div className="mt-0.5 text-muted-foreground">{doc.trip.enquiryReference}</div>
                    {doc.status === 'cancelled' && (
                      <Badge variant="outline" className="mt-1 text-destructive">
                        {t('bookingsCancelled')}
                      </Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {format.dateTime(new Date(doc.bookedAt), { dateStyle: 'medium' })}
                    {!row.emailed_at && <div className="text-xs text-destructive">{t('bookingsNotEmailed')}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{doc.traveller.name}</div>
                    <div className="text-xs text-muted-foreground">{doc.traveller.email}</div>
                    <div className="text-xs text-muted-foreground">{doc.traveller.phone}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{doc.operator.name}</div>
                    <div className="text-xs text-muted-foreground">{doc.operator.email}</div>
                    <div className="text-xs text-muted-foreground">{doc.operator.phone}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div>{doc.trip.destination ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {[doc.trip.travelStart, doc.trip.travelEnd].filter(Boolean).join(' → ')}
                      {doc.quote.itinerary.length > 0 && ` · ${t('bookingsDays', { count: doc.quote.itinerary.length })}`}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                    {formatMoney(doc.quote.totalAmount, doc.quote.currency, locale)}
                    {doc.quote.priceBasis === 'per_person' && (
                      <div className="text-xs font-normal text-muted-foreground">{t('bookingsPerPerson')}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={`/api/bookings/${doc.reference}/pdf`}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      <FileDown className="size-4" aria-hidden />
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
