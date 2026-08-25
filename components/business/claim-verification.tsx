'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, BadgeCheck, Loader2, Mail } from 'lucide-react';

import {
  requestClaimVerification,
  confirmClaimVerification,
  type VerifyState,
} from '@/lib/claims/verification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Proves a claim by the address the licensing register published.
 *
 * The code goes to the listing's own contact address, never to one typed here —
 * that is the entire point. Completing it demonstrates access to the mailbox the
 * operator gave their regulator, which is a stronger statement than any evidence
 * paragraph and takes the reviewer seconds rather than minutes.
 *
 * Optional. A listing with no published address, or a claimant who does not have
 * that mailbox any more, still has the evidence route below.
 */
export function ClaimVerification({
  businessId,
  onVerified,
}: {
  businessId: string;
  onVerified: () => void;
}) {
  const t = useTranslations('claim.verify');
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<VerifyState>({});
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);

  function send() {
    startTransition(async () => {
      const result = await requestClaimVerification(businessId);
      setState(result);
      // A domain match comes back already verified — there is no code to
      // enter, so skip straight past the code step.
      if (result.verified) onVerified();
      else if (result.sentTo) setSent(true);
    });
  }

  function confirm() {
    startTransition(async () => {
      const result = await confirmClaimVerification(businessId, code);
      setState(result);
      if (result.verified) onVerified();
    });
  }

  if (state.verified) {
    return (
      <Alert>
        <BadgeCheck className="size-4" aria-hidden />
        <AlertDescription>
          <strong className="block">{t('confirmed')}</strong>
          {state.method === 'domain'
            ? t('confirmedDomain', { contact: state.sentTo ?? '' })
            : t('confirmedBody', { contact: state.sentTo ?? '' })}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-secondary/30 p-5">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="font-medium">{t('title')}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('intro')}</p>
        </div>
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{t(`errors.${state.error}`)}</AlertDescription>
        </Alert>
      )}

      {!sent ? (
        <Button type="button" variant="outline" onClick={send} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t('send')}
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">{t('sentTo', { contact: state.sentTo ?? '' })}</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="claim-code">{t('code')}</Label>
              <Input
                id="claim-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-32 font-mono tracking-widest"
                placeholder="000000"
              />
            </div>
            <Button type="button" onClick={confirm} disabled={pending || code.length !== 6}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {t('confirm')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={send} disabled={pending}>
              {t('resend')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
