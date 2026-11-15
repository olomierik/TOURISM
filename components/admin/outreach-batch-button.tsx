'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2, Send, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { planOutreachBatch, sendOutreachChunk } from '@/lib/outreach/send-batch';
import { CHUNK_SIZE, DAILY_CAP, type BatchFilter } from '@/lib/outreach/batch-shared';

/**
 * One click, up to ninety invitations, from the group on screen.
 *
 * The server chooses who and enforces the daily limit; this only asks for the
 * list, feeds it back a few at a time, and shows how far it has got. Leaving
 * the page stops the run where it is — whatever was not sent stays in its
 * group for the next click.
 */
export function OutreachBatchButton({
  filter,
  country,
  available,
}: {
  filter: BatchFilter;
  country: string;
  /** How many listings are in this group. */
  available: number;
}) {
  const router = useRouter();
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState<{
    total: number;
    sent: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const [message, setMessage] = React.useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const stopRef = React.useRef(false);

  async function run() {
    stopRef.current = false;
    setMessage(null);
    setProgress(null);
    setRunning(true);
    try {
      const plan = await planOutreachBatch(filter, country);
      if ('error' in plan) {
        setMessage({ tone: 'bad', text: plan.error });
        return;
      }
      if (plan.ids.length === 0) {
        setMessage({ tone: 'ok', text: 'Nobody left to email in this group.' });
        return;
      }

      const tally = { total: plan.ids.length, sent: 0, skipped: 0, failed: 0 };
      setProgress({ ...tally });
      let stopped: string | undefined;

      for (let i = 0; i < plan.ids.length && !stopRef.current; i += CHUNK_SIZE) {
        const result = await sendOutreachChunk(plan.ids.slice(i, i + CHUNK_SIZE));
        tally.sent += result.sent;
        tally.skipped += result.skipped;
        tally.failed += result.failed;
        setProgress({ ...tally });
        if (result.stop) {
          stopped = result.stop;
          break;
        }
      }

      const summary =
        `${tally.sent} sent` +
        (tally.skipped ? `, ${tally.skipped} skipped` : '') +
        (tally.failed ? `, ${tally.failed} failed` : '') +
        '.';
      if (stopped) setMessage({ tone: 'bad', text: `Stopped: ${stopped} ${summary}` });
      else if (stopRef.current) setMessage({ tone: 'ok', text: `Stopped by you. ${summary}` });
      else setMessage({ tone: tally.failed ? 'bad' : 'ok', text: `Finished. ${summary}` });
    } catch {
      setMessage({
        tone: 'bad',
        text: 'The connection dropped. Emails already sent are recorded; press the button again to continue.',
      });
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  const done = progress ? progress.sent + progress.skipped + progress.failed : 0;
  const count = Math.min(DAILY_CAP, available);

  return (
    <div className="space-y-3 rounded-lg border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        {running ? (
          <Button type="button" variant="secondary" onClick={() => (stopRef.current = true)}>
            <Square className="size-4" aria-hidden />
            Stop
          </Button>
        ) : (
          <Button type="button" onClick={run} disabled={available === 0}>
            <Send className="size-4" aria-hidden />
            {filter === 'failed' ? `Retry the next ${count}` : `Email the next ${count}`}
          </Button>
        )}
        <p className="min-w-0 flex-1 text-body-sm text-muted-foreground">
          Sends the claim invitation to up to {DAILY_CAP} operators in this group, in
          alphabetical order. No more than {DAILY_CAP} go out in any 24 hours, to keep the
          messages out of spam. Keep this page open until it finishes.
        </p>
      </div>

      {progress && (
        <div aria-live="polite">
          <div className="h-2 overflow-hidden rounded-pill bg-surface-sunken">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${Math.round((done / progress.total) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-body-sm tabular-nums text-muted-foreground">
            {running && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            {done} of {progress.total} · {progress.sent} sent
            {progress.skipped > 0 && ` · ${progress.skipped} skipped`}
            {progress.failed > 0 && ` · ${progress.failed} failed`}
          </p>
        </div>
      )}

      {message && (
        <p
          role="status"
          className={
            message.tone === 'ok'
              ? 'flex items-start gap-1.5 text-body-sm text-[var(--success-800)]'
              : 'flex items-start gap-1.5 text-body-sm text-[var(--danger-600)]'
          }
        >
          {message.tone === 'ok' ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          {message.text}
        </p>
      )}
    </div>
  );
}
