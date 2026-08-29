'use client';

import { useActionState, useState } from 'react';
import { AlertTriangle, Check, Loader2, Mail, ShieldOff } from 'lucide-react';

import { queueBatch, suppressAddress, type OutreachActionState } from '@/lib/outreach/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export type OutreachBatch = {
  batch: string;
  draft: number;
  queued: number;
  sent: number;
  failed: number;
  skipped: number;
};

export type OutreachSample = {
  id: string;
  email: string;
  subject: string;
  body: string;
  status: string;
  businessName: string;
};

const initial: OutreachActionState = {};

/**
 * Reviewing outreach before any of it leaves.
 *
 * The message is shown in full, not summarised. An admin approving a batch is
 * taking responsibility for 400 real businesses receiving an unsolicited email
 * under their name, and a preview that hides the wording makes that a rubber
 * stamp. Queueing is still not sending — the send script needs --confirm at a
 * terminal — but this is where a person reads what is about to go out.
 */
export function OutreachReview({
  batches,
  samples,
  suppressed,
}: {
  batches: OutreachBatch[];
  samples: OutreachSample[];
  suppressed: { email: string; reason: string }[];
}) {
  const [queueState, queueAction, queuePending] = useActionState(queueBatch, initial);
  const [suppressState, suppressAction, suppressPending] = useActionState(
    suppressAddress,
    initial,
  );
  const [open, setOpen] = useState<string | null>(samples[0]?.id ?? null);

  return (
    <div className="space-y-10">
      {batches.length === 0 ? (
        <Alert>
          <Mail className="size-4" aria-hidden />
          <AlertDescription>
            <strong className="block">Nothing staged</strong>
            Stage a batch first — it writes drafts only:
            <code className="mt-2 block rounded bg-muted px-2 py-1 text-xs">
              node scripts/stage-outreach.mjs --batch=2026-08-a --limit=25
            </code>
          </AlertDescription>
        </Alert>
      ) : (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Batches</h2>

          {(queueState.error || queueState.done) && (
            <Alert variant={queueState.error ? 'destructive' : 'default'}>
              {queueState.error ? (
                <AlertTriangle className="size-4" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )}
              <AlertDescription>{queueState.error ?? queueState.done}</AlertDescription>
            </Alert>
          )}

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">Batch</th>
                  <th className="p-3 font-medium">Draft</th>
                  <th className="p-3 font-medium">Queued</th>
                  <th className="p-3 font-medium">Sent</th>
                  <th className="p-3 font-medium">Failed</th>
                  <th className="p-3 font-medium">Skipped</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.batch} className="border-t">
                    <td className="p-3 font-mono text-xs">{b.batch}</td>
                    <td className="p-3">{b.draft}</td>
                    <td className="p-3">{b.queued}</td>
                    <td className="p-3 font-medium">{b.sent}</td>
                    <td className="p-3">{b.failed > 0 ? <span className="text-destructive">{b.failed}</span> : 0}</td>
                    <td className="p-3 text-muted-foreground">{b.skipped}</td>
                    <td className="p-3 text-right">
                      {b.draft > 0 && (
                        <form action={queueAction}>
                          <input type="hidden" name="batch" value={b.batch} />
                          <Button size="sm" variant="outline" disabled={queuePending}>
                            {queuePending && <Loader2 className="size-3 animate-spin" aria-hidden />}
                            Approve {b.draft}
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-muted-foreground">
            Approving marks a batch queued. Nothing is sent until{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              node scripts/send-outreach.mjs --batch=… --confirm
            </code>{' '}
            is run, and that script refuses to start without a real mail provider
            configured.
          </p>
        </section>
      )}

      {samples.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold">
            What they will receive
          </h2>
          <div className="flex flex-wrap gap-2">
            {samples.map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant={open === s.id ? 'default' : 'outline'}
                onClick={() => setOpen(s.id)}
              >
                {s.businessName.slice(0, 28)}
              </Button>
            ))}
          </div>

          {samples
            .filter((s) => s.id === open)
            .map((s) => (
              <div key={s.id} className="space-y-3 rounded-xl border p-5">
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">To:</span> {s.email}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Subject:</span>{' '}
                    <strong>{s.subject}</strong>
                  </p>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                  {s.body}
                </pre>
              </div>
            ))}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Do not contact</h2>
        <p className="text-sm text-muted-foreground">
          Anyone who replies asking to be left alone goes here. It is permanent,
          keyed on the address rather than the listing, and it overrides a queued
          message — a suppression that lets an already-approved email through is
          not a suppression.
        </p>

        {(suppressState.error || suppressState.done) && (
          <Alert variant={suppressState.error ? 'destructive' : 'default'}>
            {suppressState.error ? (
              <AlertTriangle className="size-4" aria-hidden />
            ) : (
              <Check className="size-4" aria-hidden />
            )}
            <AlertDescription>{suppressState.error ?? suppressState.done}</AlertDescription>
          </Alert>
        )}

        <form action={suppressAction} className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="sup-email">Email address</Label>
            <Input id="sup-email" name="email" type="email" required className="w-72" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-reason">Reason</Label>
            <Input id="sup-reason" name="reason" defaultValue="requested" className="w-44" />
          </div>
          <Button type="submit" variant="destructive" disabled={suppressPending}>
            {suppressPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            <ShieldOff className="size-4" aria-hidden />
            Suppress
          </Button>
        </form>

        {suppressed.length > 0 && (
          <ul className="space-y-1 text-sm">
            {suppressed.map((s) => (
              <li key={s.email} className="flex gap-2 text-muted-foreground">
                <span className="font-mono text-xs">{s.email}</span>
                <span>— {s.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
