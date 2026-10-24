'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { BadgeCheck, Check, KeyRound, Loader2 } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { redeemClaimInvite, type InviteClaimState } from '@/lib/claims/actions';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const initial: InviteClaimState = {};

/**
 * The claim page opened from a single-use claim link.
 *
 * Signed out, it says where the link came from and offers an account that
 * comes straight back here. Signed in, one button files the claim, already
 * verified: the link is the proof, so there is no code and no evidence to write.
 */
export function ClaimInvite({
  businessId,
  businessName,
  token,
  sentTo,
  signedIn,
  next,
}: {
  businessId: string;
  businessName: string;
  token: string;
  /** The masked address the link was sent to. */
  sentTo: string;
  signedIn: boolean;
  /** This page with its invite, for coming back after signing in. */
  next: string;
}) {
  const t = useTranslations('claimInvite');
  const [state, action, pending] = useActionState(
    redeemClaimInvite.bind(null, businessId, token),
    initial,
  );

  if (state.submitted) {
    return (
      <Alert>
        <Check className="size-4" aria-hidden />
        <AlertDescription>
          <strong className="block">{t('doneTitle', { business: businessName })}</strong>
          {t('doneBody')}
          <span className="mt-2 block">
            <Link href="/account" className="font-medium underline underline-offset-4">
              {t('doneLink')}
            </Link>
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-6">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="font-semibold">{t('title', { business: businessName })}</p>
          <p className="text-sm text-muted-foreground">{t('body', { email: sentTo })}</p>
        </div>
      </div>

      {signedIn ? (
        <form action={action} className="space-y-3">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <BadgeCheck className="size-4" aria-hidden />
            )}
            {t('confirm', { business: businessName })}
          </Button>
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {t(`errors.${state.error}`)}
            </p>
          )}
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={{ pathname: '/register', query: { next, as: 'business' } }}>{t('register')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={{ pathname: '/login', query: { next } }}>{t('signIn')}</Link>
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{t('note')}</p>
    </div>
  );
}
