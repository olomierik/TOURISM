'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { deleteTrip } from '@/lib/trip/actions';

/**
 * Deleting a saved trip, behind one confirmation.
 *
 * The confirmation is inline rather than a dialog because there is nothing to
 * read — the trip is on screen above the button. What matters is that the first
 * click cannot delete: this is somebody's plan, the row is gone for good, and
 * the button sits next to "Open" on a small screen.
 */
export function DeleteTripButton({ tripId, label }: { tripId: string; label: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!confirming) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setConfirming(true)}
        className="text-muted-foreground"
      >
        <Trash2 className="size-4" aria-hidden />
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
            await deleteTrip(tripId);
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
