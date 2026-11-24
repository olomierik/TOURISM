'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, FileDown, Loader2, LogIn } from 'lucide-react';

import { bookTrip } from '@/lib/bookings/actions';
import { Button } from '@/components/ui/button';

/**
 * BOOKED, on one operator's quote.
 *
 * Two presses on purpose: the first shows exactly what is being agreed (who,
 * how much) and what happens next (both receive the trip document), the
 * second books. Signed-out travellers are sent to sign in and brought back
 * here, because the document is emailed to an account and listed under it.
 */
export function BookButton({
  leadBusinessId,
  token,
  businessName,
  price,
  signedIn,
  signInHref,
  initialReference,
}: {
  leadBusinessId: string;
  token?: string;
  businessName: string;
  price: string;
  signedIn: boolean;
  signInHref: string;
  /** Set when this quote is already booked. */
  initialReference?: string | null;
}) {
  const t = useTranslations('quoteCompare');
  const [confirming, setConfirming] = useState(false);
  const [reference, setReference] = useState(initialReference ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (reference) {
    return (
      <div className="mt-3 rounded-xl border border-success/40 bg-success/10 p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
          <CheckCircle2 className="size-4" aria-hidden />
          {t('booked', { reference })}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t('bookedHint')}</p>
        <a
          href={`/api/bookings/${reference}/pdf`}
          target="_blank"
          rel="noopener"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <FileDown className="size-4" aria-hidden />
          {t('downloadPdf')}
        </a>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="mt-3 space-y-1.5">
        <Button asChild className="w-full">
          <a href={signInHref}>
            <LogIn className="size-4" aria-hidden />
            {t('signInToBook')}
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">{t('signInHint')}</p>
      </div>
    );
  }

  if (!confirming) {
    return (
      <div className="mt-3 space-y-1.5">
        <Button className="w-full" onClick={() => setConfirming(true)}>
          {t('book')}
        </Button>
        <p className="text-xs text-muted-foreground">{t('bookHint', { name: businessName })}</p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-primary/40 bg-primary-subtle p-3" role="alertdialog" aria-live="polite">
      <p className="text-sm font-semibold">{t('confirmTitle', { name: businessName })}</p>
      <p className="mt-1 text-sm">{t('confirmBody', { price })}</p>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await bookTrip(leadBusinessId, token);
              if (res.reference) setReference(res.reference);
              else if (res.error === 'signIn') window.location.href = signInHref;
              else setError(t(`bookErrors.${res.error ?? 'generic'}`));
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? t('booking') : t('confirm')}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
          {t('notYet')}
        </Button>
      </div>
    </div>
  );
}
