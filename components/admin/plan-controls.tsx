'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { grantPlan, endSubscription, rejectPayment } from '@/lib/billing/admin-actions';

type PlanOption = { id: string; key: string; label: string };

/**
 * Granting a plan, from either side of the page.
 *
 * `payment` mode confirms a specific transfer: one click, because the admin has
 * already done the deciding by matching a reference against a bank statement,
 * and the plan is implied by what the operator asked for.
 *
 * `business` mode grants anything to anybody — for a partner, a test, or a
 * business that paid in cash. Both end in the same database function, which is
 * where the admin check and the period arithmetic live.
 *
 * Rejecting and ending both ask once. They are the two that take something
 * away, and neither is undoable from this page.
 */
export function PlanControls({
  businessId,
  planId,
  paymentId,
  subscriptionId,
  plans,
  mode,
  grantLabel,
  confirmLabel,
  rejectLabel,
  endLabel,
}: {
  businessId: string;
  planId?: string;
  paymentId?: string;
  subscriptionId?: string | null;
  plans: PlanOption[];
  mode: 'payment' | 'business';
  grantLabel: string;
  confirmLabel?: string;
  rejectLabel?: string;
  endLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = useState(plans[0]?.id ?? '');
  const [confirming, setConfirming] = useState<null | 'reject' | 'end'>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      setError(result.error ?? null);
      setConfirming(null);
      if (!result.error) router.refresh();
    });

  if (mode === 'payment') {
    return (
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => run(() => grantPlan(businessId, planId!, paymentId))}
          >
            <Check className="size-4" aria-hidden />
            {confirmLabel}
          </Button>

          {confirming === 'reject' ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={() => run(() => rejectPayment(paymentId!, 'not received'))}
              >
                {rejectLabel}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                ×
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setConfirming('reject')}
            >
              <X className="size-4" aria-hidden />
              {rejectLabel}
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={chosen}
          onChange={(e) => setChosen(e.target.value)}
          className="rounded-lg border bg-background px-2 py-1.5 text-xs"
          aria-label={grantLabel}
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || !chosen}
          onClick={() => run(() => grantPlan(businessId, chosen))}
        >
          {grantLabel}
        </Button>

        {subscriptionId &&
          (confirming === 'end' ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={() => run(() => endSubscription(subscriptionId))}
              >
                {endLabel}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                ×
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setConfirming('end')}
            >
              {endLabel}
            </Button>
          ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
