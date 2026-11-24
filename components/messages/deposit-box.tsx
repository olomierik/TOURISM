'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Smartphone } from 'lucide-react';

import { reportDeposit, type PaymentState } from '@/lib/bookings/payments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type PaymentRow = { id: string; amount: string; method: string; reference: string | null; status: string; date: string };

/**
 * After BOOKED: where to pay the guide a deposit, a way to say it was paid,
 * and what the guide has confirmed. The site never takes the money.
 */
export function DepositBox({
  reference,
  mobileMoney,
  currency,
  payments,
}: {
  reference: string;
  mobileMoney: string | null;
  currency: string;
  payments: PaymentRow[];
}) {
  const t = useTranslations('booking.deposit');
  const [state, action, pending] = useActionState<PaymentState, FormData>(reportDeposit.bind(null, reference), {});
  return (
    <div className="mt-3 rounded-xl border bg-card p-3 text-sm">
      <p className="flex items-center gap-1.5 font-semibold">
        <Smartphone className="size-4" aria-hidden />
        {t('title')}
      </p>
      <p className="mt-1 text-muted-foreground">{mobileMoney ? t('payTo', { details: mobileMoney }) : t('askGuide')}</p>
      {payments.length > 0 && (
        <ul className="mt-2 space-y-1">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-2 py-1.5">
              <span>
                {p.amount} · {t(`method.${p.method as 'mobile_money'}`)}
                {p.reference ? ` · ${p.reference}` : ''} · {p.date}
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  p.status === 'confirmed' ? 'bg-success/10 text-success' : p.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-muted',
                )}
              >
                {t(`status.${p.status as 'reported'}`)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_5.5rem_9rem_1fr_auto]">
        <Input name="amount" type="number" min={1} required inputMode="numeric" placeholder={t('amount')} aria-label={t('amount')} />
        <Select name="currency" defaultValue={currency === 'TZS' ? 'TZS' : 'USD'} aria-label={t('currency')}>
          <option value="USD">USD</option>
          <option value="TZS">TZS</option>
        </Select>
        <Select name="method" defaultValue="mobile_money" aria-label={t('methodLabel')}>
          {(['mobile_money', 'bank', 'cash', 'other'] as const).map((m) => (
            <option key={m} value={m}>
              {t(`method.${m}`)}
            </option>
          ))}
        </Select>
        <Input name="reference" maxLength={120} placeholder={t('reference')} aria-label={t('reference')} />
        <Button type="submit" size="sm" className="col-span-2 sm:col-span-1" disabled={pending}>
          {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {t('report')}
        </Button>
      </form>
      {state.success && <p className="mt-2 text-xs text-success">{t('reported')}</p>}
      {state.error && <p className="mt-2 text-xs text-destructive">{t(`errors.${state.error}`)}</p>}
    </div>
  );
}
