import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Banknote, MessageCircle } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { activeBusinessId } from '@/lib/dashboard/active-business';
import { BANK_DETAILS, whatsappLink } from '@/lib/billing/bank';
import { formatMoney } from '@/lib/leads/quote-types';
import { cn } from '@/lib/utils';

/**
 * A guide's per-traveller fees: one per booked trip, due the day after the
 * trip ends. Nothing is charged automatically; the guide pays by bank or
 * mobile money with the booking reference, and admin marks it paid.
 */
export default async function DashboardFeesPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const businessId = user ? await activeBusinessId(supabase, user.id) : null;
  const [t, format] = await Promise.all([getTranslations('fees'), getFormatter()]);
  const { data: rows } = businessId
    ? await supabase
        .from('platform_fees')
        .select('id, travellers, fee_per_person, currency, amount, due_on, status, paid_at, paid_reference, bookings (reference)')
        .eq('business_id', businessId)
        .order('due_on', { ascending: false })
    : { data: [] };
  const today = new Date().toISOString().slice(0, 10);
  const fees = (rows ?? []).map((r) => {
    const b = (Array.isArray(r.bookings) ? r.bookings[0] : r.bookings) as { reference: string } | null;
    const state = (r.status !== 'open' ? r.status : r.due_on < today ? 'due' : 'upcoming') as 'due' | 'upcoming' | 'paid' | 'waived';
    return { ...r, reference: b?.reference ?? '—', state };
  });
  const due = fees.filter((f) => f.state === 'due');
  const dueTotal = due.reduce((s, f) => s + Number(f.amount), 0);
  const currency = fees[0]?.currency ?? 'USD';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">{t('lead')}</p>
      </div>

      {due.length > 0 && (
        <section className="rounded-2xl border border-primary/40 bg-primary-subtle p-4">
          <p className="font-semibold">{t('dueNow', { amount: formatMoney(dueTotal, currency, locale), count: due.length })}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-card p-3 text-body-sm">
              <p className="flex items-center gap-1.5 font-semibold">
                <Banknote className="size-4" aria-hidden />
                {t('payBank')}
              </p>
              <p className="mt-1">
                {BANK_DETAILS.bankName} · {BANK_DETAILS.accountName}
                <br />
                <span className="font-mono">{BANK_DETAILS.accountNumber}</span>
              </p>
              <p className="mt-1 text-caption text-muted-foreground">{t('payReference')}</p>
            </div>
            <a
              href={whatsappLink(t('whatsappMessage', { refs: due.map((f) => f.reference).join(', ') }))}
              target="_blank"
              rel="noopener noreferrer"
              className="press flex flex-col rounded-xl border border-[#25D366]/50 bg-[#25D366]/10 p-3 text-body-sm"
            >
              <span className="flex items-center gap-1.5 font-semibold">
                <MessageCircle className="size-4" aria-hidden />
                {t('payMobile')}
              </span>
              <span className="mt-1">{t('payMobileBody')}</span>
            </a>
          </div>
        </section>
      )}

      {fees.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-body-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[36rem] text-body-sm">
            <thead className="bg-muted/50 text-left text-caption uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t('booking')}</th>
                <th className="px-3 py-2">{t('travellers')}</th>
                <th className="px-3 py-2 text-right">{t('amount')}</th>
                <th className="px-3 py-2">{t('dueOn')}</th>
                <th className="px-3 py-2">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fees.map((f) => (
                <tr key={f.id}>
                  <td className="px-3 py-2 font-mono text-caption">{f.reference}</td>
                  <td className="px-3 py-2">
                    {f.travellers} × {formatMoney(Number(f.fee_per_person), f.currency, locale)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatMoney(Number(f.amount), f.currency, locale)}</td>
                  <td className="px-3 py-2">{format.dateTime(new Date(`${f.due_on}T12:00:00Z`), { dateStyle: 'medium' })}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-caption font-medium',
                        f.state === 'due' && 'bg-destructive/10 text-destructive',
                        f.state === 'upcoming' && 'bg-muted',
                        f.state === 'paid' && 'bg-success/10 text-success',
                        f.state === 'waived' && 'bg-muted text-muted-foreground',
                      )}
                    >
                      {t(`state.${f.state}`)}
                    </span>
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
