'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Building2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { startBankTransfer, type BankTransferState } from '@/lib/billing/actions';

/**
 * Starts a bank transfer for one plan.
 *
 * Only the plan key is posted. The price is read from the database inside the
 * action, because a price posted by the browser is a price the operator
 * chooses — the same reason the card checkout this replaces worked that way.
 *
 * The label says "pay by bank transfer" rather than "subscribe", because
 * nothing subscribes when this is pressed. It produces a reference and a set of
 * account details, and a person confirms the rest.
 */
export function BankTransferButton({ planKey, label }: { planKey: string; label: string }) {
  const t = useTranslations('billing');
  const [state, action, pending] = useActionState<BankTransferState, FormData>(
    startBankTransfer,
    {},
  );

  return (
    <form action={action} className="mt-6 space-y-2">
      <input type="hidden" name="planKey" value={planKey} />

      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{t(`error.${state.error}`)}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Building2 className="size-4" aria-hidden />
        )}
        {label}
      </Button>
    </form>
  );
}
