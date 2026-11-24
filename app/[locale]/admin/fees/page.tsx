import { getFormatter, setRequestLocale } from 'next-intl/server';
import { Banknote } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatMoney } from '@/lib/leads/quote-types';
import { feePerPerson } from '@/lib/fees/create';
import { FeeSetting, SettleFee } from '@/components/admin/fee-controls';

/**
 * Per-traveller fees owed by local tour guides, one per booked trip, due the
 * day after the trip. Due ones first. Admin marks them paid against the bank
 * or mobile money reference, or waives them.
 */
export default async function AdminFeesPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const [{ data: rows }, setting, format] = await Promise.all([
    supabase
      .from('platform_fees')
      .select('id, travellers, fee_per_person, currency, amount, due_on, status, paid_reference, note, businesses (name, phone), bookings (reference, traveller)')
      .order('due_on', { ascending: true })
      .limit(500),
    feePerPerson(createAdminClient()),
    getFormatter(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const fees = (rows ?? []).map((r) => {
    const biz = (Array.isArray(r.businesses) ? r.businesses[0] : r.businesses) as { name: string; phone: string | null } | null;
    const bk = (Array.isArray(r.bookings) ? r.bookings[0] : r.bookings) as { reference: string; traveller: { name?: string } } | null;
    const state = r.status !== 'open' ? r.status : r.due_on < today ? 'due' : 'upcoming';
    return { ...r, biz, bk, state };
  });
  const rank: Record<string, number> = { due: 0, upcoming: 1, paid: 2, waived: 3 };
  fees.sort((a, b) => rank[a.state] - rank[b.state]);
  const owed = fees.filter((f) => f.state === 'due').reduce((s, f) => s + Number(f.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Banknote className="size-6 text-primary" aria-hidden />
          Group trip fees
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          One fee per booked trip with a local tour guide: travellers × fee per traveller, due the day after the trip
          ends. Overdue now: <strong>{formatMoney(owed, setting.currency, locale)}</strong>.
        </p>
      </div>
      <section className="rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Fee per traveller (new bookings)</p>
        <div className="mt-2">
          <FeeSetting amount={setting.amount} currency={setting.currency} />
        </div>
      </section>
      {fees.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No fees yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Guide</th>
                <th className="px-3 py-2">Booking</th>
                <th className="px-3 py-2">Travellers</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fees.map((f) => (
                <tr key={f.id} className="align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{f.biz?.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{f.biz?.phone}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {f.bk?.reference}
                    <div className="font-sans text-muted-foreground">{f.bk?.traveller?.name}</div>
                  </td>
                  <td className="px-3 py-2">
                    {f.travellers} × {formatMoney(Number(f.fee_per_person), f.currency, locale)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatMoney(Number(f.amount), f.currency, locale)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{format.dateTime(new Date(`${f.due_on}T12:00:00Z`), { dateStyle: 'medium' })}</td>
                  <td className="px-3 py-2">
                    {f.state}
                    {f.paid_reference && <div className="text-xs text-muted-foreground">{f.paid_reference}</div>}
                    {f.note && <div className="text-xs text-muted-foreground">{f.note}</div>}
                  </td>
                  <td className="px-3 py-2">{f.status === 'open' ? <SettleFee feeId={f.id} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
