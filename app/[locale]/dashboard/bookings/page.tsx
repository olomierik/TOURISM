import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { FileDown, MessagesSquare } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { activeBusinessId } from '@/lib/dashboard/active-business';
import { formatMoney } from '@/lib/leads/quote-types';
import { PaymentDecision } from '@/components/dashboard/payment-decision';

/**
 * Every trip booked with this business: the traveller, the dates, the price,
 * the trip document, deposits the traveller reported (confirm or not), and
 * the group chat when it was an open group trip.
 */
export default async function DashboardBookingsPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const businessId = user ? await activeBusinessId(supabase, user.id) : null;
  const [t, tDep, format] = await Promise.all([getTranslations('booking.list'), getTranslations('booking.deposit'), getFormatter()]);
  const { data: rows } = businessId
    ? await supabase
        .from('bookings')
        .select('id, reference, status, booked_at, quote, trip, traveller, booking_payments (id, amount, currency, method, reference, status, created_at), leads (group_departures (slug, title))')
        .eq('business_id', businessId)
        .order('booked_at', { ascending: false })
        .limit(200)
    : { data: [] };
  const date = (iso: string | null | undefined) => (iso ? format.dateTime(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso), { dateStyle: 'medium' }) : '—');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">{t('lead')}</p>
      </div>
      {(rows ?? []).length === 0 && <p className="rounded-2xl border border-dashed p-6 text-center text-body-sm text-muted-foreground">{t('empty')}</p>}
      {(rows ?? []).map((b) => {
        const q = b.quote as { totalAmount: number; currency: string; priceBasis: string };
        const trip = b.trip as { travelStart: string | null; travelEnd: string | null; adults: number | null; children: number | null };
        const who = b.traveller as { name: string; email: string | null; phone: string | null; whatsapp: string | null };
        const lead = (Array.isArray(b.leads) ? b.leads[0] : b.leads) as { group_departures?: { slug: string; title: string } | { slug: string; title: string }[] | null } | null;
        const dep = lead?.group_departures ? (Array.isArray(lead.group_departures) ? lead.group_departures[0] : lead.group_departures) : null;
        return (
          <article key={b.id} className="rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-caption text-muted-foreground">{b.reference}</p>
                <p className="font-semibold">{who.name}</p>
                <p className="text-body-sm text-muted-foreground">{[who.phone, who.email].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="text-right text-body-sm">
                <p className="font-semibold">
                  {formatMoney(q.totalAmount, q.currency, locale)} {q.priceBasis === 'per_person' ? t('perPerson') : ''}
                </p>
                <p className="text-muted-foreground">
                  {date(trip.travelStart)} – {date(trip.travelEnd)} · {t('people', { count: (trip.adults ?? 0) + (trip.children ?? 0) })}
                </p>
              </div>
            </div>
            {dep && <p className="mt-1 text-body-sm">{t('groupTrip', { title: dep.title })}</p>}
            <div className="mt-2 flex flex-wrap gap-3 text-body-sm">
              <a href={`/api/bookings/${b.reference}/pdf`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                <FileDown className="size-4" aria-hidden />
                {t('pdf')}
              </a>
              {dep && (
                <Link href={{ pathname: '/group-trips/[slug]/chat', params: { slug: dep.slug } }} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                  <MessagesSquare className="size-4" aria-hidden />
                  {t('chat')}
                </Link>
              )}
            </div>
            {(b.booking_payments ?? []).length > 0 && (
              <ul className="mt-3 space-y-1.5 border-t pt-3">
                {(b.booking_payments ?? []).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-body-sm">
                    <span>
                      {t('depositLine', {
                        amount: formatMoney(Number(p.amount), p.currency, locale),
                        method: tDep(`method.${p.method as 'mobile_money'}`),
                        date: date(p.created_at),
                      })}
                      {p.reference ? ` · ${p.reference}` : ''}
                    </span>
                    {p.status === 'reported' ? <PaymentDecision paymentId={p.id} /> : <span className="text-caption text-muted-foreground">{tDep(`status.${p.status as 'confirmed'}`)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}
