'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';

import { decideTourGuide } from '@/lib/tour-guides/actions';
import { Button } from '@/components/ui/button';

/** Verify or send back, with the reason the guide will read (admin, English). */
export function GuideDecision({ businessId, status }: { businessId: string; status: string }) {
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (decision: 'verify' | 'reject') =>
    start(async () => {
      setMessage(null);
      const res = await decideTourGuide(businessId, decision, note);
      setMessage(
        res.success
          ? decision === 'verify'
            ? 'Verified and published. The guide has been emailed.'
            : 'Sent back. The guide has been emailed the reason.'
          : res.error === 'noteRequired'
            ? 'Write the reason first: the guide reads it.'
            : 'That did not work. Try again.',
      );
    });
  return (
    <div className="space-y-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Note to the guide (required when sending back)"
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending || status === 'verified'} onClick={() => run('verify')}>
          {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          Verify and publish
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run('reject')}>
          Send back
        </Button>
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
