'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import { decidePayment } from '@/lib/bookings/payments';
import { Button } from '@/components/ui/button';

export function PaymentDecision({ paymentId }: { paymentId: string }) {
  const t = useTranslations('booking.deposit');
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (done) return <span className="text-xs text-muted-foreground">{done}</span>;
  const run = (d: 'confirmed' | 'rejected') =>
    start(async () => {
      const r = await decidePayment(paymentId, d);
      setDone(r.success ? t(`status.${d}`) : t('errors.generic'));
    });
  return (
    <span className="flex gap-1.5">
      <Button size="sm" disabled={pending} onClick={() => run('confirmed')}>
        {t('confirm')}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run('rejected')}>
        {t('notReceived')}
      </Button>
    </span>
  );
}
