'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { setMessageHandled } from '@/lib/contact/admin-actions';

/**
 * Marks a contact message handled, or puts it back.
 *
 * Reversible, so no confirmation. The mistake this guards against is an admin
 * clearing something they meant to read, and the fix for that is an undo rather
 * than a dialog in front of every message in the inbox.
 */
export function MarkHandledButton({
  messageId,
  handled,
  markLabel,
  handledLabel,
}: {
  messageId: string;
  handled: boolean;
  markLabel: string;
  handledLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = () =>
    startTransition(async () => {
      await setMessageHandled(messageId, !handled);
      router.refresh();
    });

  return (
    <Button
      type="button"
      size="sm"
      variant={handled ? 'ghost' : 'outline'}
      disabled={pending}
      onClick={toggle}
      className="shrink-0"
    >
      {handled ? (
        <>
          <Undo2 className="size-4" aria-hidden />
          {handledLabel}
        </>
      ) : (
        <>
          <Check className="size-4" aria-hidden />
          {markLabel}
        </>
      )}
    </Button>
  );
}
