'use client';

import { useActionState, useTransition } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { markLocationReviewed, saveVerification, type VerificationState } from '@/lib/admin/verification';
import { Button } from '@/components/ui/button';

/**
 * What was checked before a listing is called verified (SEO brief T14).
 * Admin console copy, not translated, like the rest of it.
 */
export function VerificationForm({
  business,
}: {
  business: {
    id: string;
    licenseNumber: string | null;
    licenseCheckedAt: string | null;
    licenseSource: string | null;
    registrationNumber: string | null;
    registrationCheckedAt: string | null;
    identityCheckedAt: string | null;
    notes: string | null;
    verified: boolean;
  };
}) {
  const [state, action, pending] = useActionState<VerificationState, FormData>(saveVerification, {});
  const day = (iso: string | null) => (iso ? ` (checked ${iso.slice(0, 10)})` : '');

  return (
    <form action={action} className="space-y-4 rounded-lg border bg-surface p-4">
      <input type="hidden" name="businessId" value={business.id} />
      <h2 className="font-display text-heading-sm font-semibold">Verification</h2>
      <p className="text-body-sm text-muted-foreground">
        The public &ldquo;Verified&rdquo; chip lists exactly what is ticked here. Tick a check only once you
        have done it.
      </p>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-body-sm">
          Licence number (TALA / ZATI)
          <input name="licenseNumber" defaultValue={business.licenseNumber ?? ''} className="h-10 rounded-md border bg-background px-3" />
        </label>
        <label className="grid gap-1 text-body-sm">
          Checked against (register, letter, URL)
          <input name="licenseSource" defaultValue={business.licenseSource ?? ''} className="h-10 rounded-md border bg-background px-3" />
        </label>
        <label className="flex items-center gap-2 text-body-sm sm:col-span-2">
          <input type="checkbox" name="licenseChecked" defaultChecked={Boolean(business.licenseCheckedAt)} />
          Licence checked{day(business.licenseCheckedAt)}
        </label>

        <label className="grid gap-1 text-body-sm">
          Business registration (BRELA or equivalent)
          <input name="registrationNumber" defaultValue={business.registrationNumber ?? ''} className="h-10 rounded-md border bg-background px-3" />
        </label>
        <label className="flex items-center gap-2 self-end text-body-sm">
          <input type="checkbox" name="registrationChecked" defaultChecked={Boolean(business.registrationCheckedAt)} />
          Registration checked{day(business.registrationCheckedAt)}
        </label>

        <label className="flex items-center gap-2 text-body-sm sm:col-span-2">
          <input type="checkbox" name="identityChecked" defaultChecked={Boolean(business.identityCheckedAt)} />
          Owner&rsquo;s identity checked{day(business.identityCheckedAt)} (do not store the document)
        </label>
      </fieldset>

      <label className="grid gap-1 text-body-sm">
        Notes (admins only)
        <textarea name="notes" rows={2} defaultValue={business.notes ?? ''} className="rounded-md border bg-background p-3" />
      </label>

      <label className="flex items-center gap-2 text-body font-semibold">
        <input type="checkbox" name="verified" defaultChecked={business.verified} />
        Show this listing as Verified
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Save verification
        </Button>
        {state.success && (
          <span className="inline-flex items-center gap-1.5 text-body-sm text-[var(--success-800)]">
            <CheckCircle2 className="size-4" aria-hidden /> Saved
          </span>
        )}
        {state.error && <span className="text-body-sm text-[var(--danger-600)]">{state.error}</span>}
      </div>
    </form>
  );
}

export function LocationReviewedButton({ businessId }: { businessId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => void (await markLocationReviewed(businessId)))}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      Address checked: show the map
    </Button>
  );
}
