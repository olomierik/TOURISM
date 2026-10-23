'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { startPremiumTrial, type TrialState } from '@/lib/billing/trial';

/**
 * The one button that starts a trial. Nothing is posted but the press itself:
 * which listing, and whether it may trial, are decided on the server.
 */
export function StartTrialButton() {
  const t = useTranslations('dashboard.trial');
  const [state, action, pending] = useActionState<TrialState>(startPremiumTrial, {});

  return (
    <form action={action} className="space-y-2">
      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{t(`error.${state.error}`)}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="size-4" aria-hidden />
        )}
        {pending ? t('starting') : t('cta')}
      </Button>
    </form>
  );
}
