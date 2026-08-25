'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CreditCard, Loader2 } from 'lucide-react';

import { startCheckout, type CheckoutState } from '@/lib/payments/actions';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const initial: CheckoutState = {};

/**
 * Opens a hosted checkout for one plan.
 *
 * The plan key is all that is posted. Price comes from the database inside the
 * action — a price posted by the browser is a price the operator chooses.
 */
export function CheckoutButton({ planKey, label }: { planKey: string; label: string }) {
  const t = useTranslations('dashboard.subscriptionPage');
  const [state, action, pending] = useActionState(startCheckout, initial);

  return (
    <form action={action} className="mt-6 space-y-2">
      <input type="hidden" name="planKey" value={planKey} />

      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{t(`checkoutErrors.${state.error}`)}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <CreditCard className="size-4" aria-hidden />
        )}
        {label}
      </Button>
    </form>
  );
}
