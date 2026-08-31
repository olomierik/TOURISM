'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { endDeal } from '@/lib/deals/actions';

/**
 * Ends a deal, behind one confirmation.
 *
 * Ending is deletion rather than a flag, because an expired deal already stops
 * existing as far as the public policy is concerned, and keeping ended ones
 * around would give an operator a list of things that look live and are not.
 * The confirmation exists because the button sits next to the deal it removes
 * and there is no undo.
 */
export function EndDealButton({ dealId, label }: { dealId: string; label: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!confirming) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
        onClick={() => setConfirming(true)}
      >
        <X className="size-4" aria-hidden />
        {label}
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await endDeal(dealId);
            router.refresh();
          })
        }
      >
        {label}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        ×
      </Button>
    </span>
  );
}
