'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';

import { beginPayment } from '@/lib/payments/methods';
import { Button } from '@/components/ui/button';
import { track } from '@/lib/analytics/track';

export type OperatorPaymentMethod = {
  id: string;
  provider: string;
  label: string | null;
};

/**
 * Sends a traveller to an operator's own checkout.
 *
 * The destination is never in this component and never in the page. Clicking
 * asks the server which URL belongs to this method, which is what keeps the
 * allow-list in migration 053 worth having — a href rendered here would be a
 * redirect anyone could rewrite before the click, and the traveller is about to
 * enter card details on the far side of it.
 *
 * Who is being paid is said out loud, above the button. Somebody who believes
 * they paid Explore Tanzania will ask us for the refund, and we will have no
 * record of a transaction that never touched us.
 */
export function PayOperator({
  businessName,
  methods,
  packageId = null,
  locale,
}: {
  businessName: string;
  methods: OperatorPaymentMethod[];
  packageId?: string | null;
  locale: string;
}) {
  const t = useTranslations('dashboard.payments');
  const [pending, startTransition] = useTransition();

  if (!methods.length) return null;

  function pay(method: OperatorPaymentMethod) {
    startTransition(async () => {
      track('payment_started', { provider: method.provider });
      const result = await beginPayment(method.id, packageId, locale);
      if (!result) return;
      // A new tab, so the listing the traveller was reading is still there when
      // they come back — whether they paid or changed their mind.
      window.open(result.url, '_blank', 'noopener,noreferrer');
    });
  }

  return (
    <section className="rounded-2xl border bg-card p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <CreditCard className="size-5 text-primary" aria-hidden />
        {t('payTitle')}
      </h2>

      <div className="mt-4 flex flex-wrap gap-3">
        {methods.map((m) => (
          <Button key={m.id} type="button" onClick={() => pay(m)} disabled={pending}>
            {m.label ?? t('payWith', { provider: t(`providers.${m.provider}` as 'providers.dpo') })}
            <ExternalLink className="size-4" aria-hidden />
          </Button>
        ))}
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-px size-4 shrink-0 text-primary" aria-hidden />
        {t('paySafety', {
          business: businessName,
          provider: t(`providers.${methods[0].provider}` as 'providers.dpo'),
        })}
      </p>
    </section>
  );
}
