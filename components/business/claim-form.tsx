'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, BadgeCheck, Check, Loader2 } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { submitClaim, type ClaimState } from '@/lib/claims/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

const initial: ClaimState = {};

/**
 * The form an operator fills in to take over a listing built from public
 * licensing records.
 *
 * The evidence field is the whole point and is required at a real length. A
 * claim with "this is my company" in it cannot be checked against anything, and
 * a queue full of those is a queue that stops being read — at which point the
 * listings stay unclaimed and the seeding was pointless.
 */
export function ClaimForm({
  businessId,
  businessName,
  signedIn,
  defaultName,
  defaultEmail,
}: {
  businessId: string;
  businessName: string;
  signedIn: boolean;
  defaultName?: string | null;
  defaultEmail?: string | null;
}) {
  const t = useTranslations('claim');
  const [state, action, pending] = useActionState(submitClaim, initial);

  if (state.submitted) {
    return (
      <Alert>
        <Check className="size-4" aria-hidden />
        <AlertDescription>
          <strong className="block">{t('submitted')}</strong>
          {t('submittedBody')}
        </AlertDescription>
      </Alert>
    );
  }

  if (!signedIn) {
    return (
      <div className="space-y-4 rounded-xl border border-dashed p-6 text-center">
        <p className="text-muted-foreground">{t('signInFirst')}</p>
        <Button asChild>
          <Link href={{ pathname: '/login', query: { next: '/dashboard' } }}>{t('signIn')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="businessId" value={businessId} />

      {/* Honeypot: hidden from people, filled in by naive bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] size-px opacity-0"
      />

      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{t(`errors.${state.error}`)}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contactName">{t('contactName')}</Label>
          <Input id="contactName" name="contactName" required defaultValue={defaultName ?? ''} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactEmail">{t('contactEmail')}</Label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            required
            defaultValue={defaultEmail ?? ''}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contactPhone">{t('contactPhone')}</Label>
        <Input id="contactPhone" name="contactPhone" type="tel" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="evidence">{t('evidence')}</Label>
        <Textarea id="evidence" name="evidence" rows={5} required minLength={20} />
        <p className="text-sm text-muted-foreground">{t('evidenceHint')}</p>
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <BadgeCheck className="size-4" aria-hidden />
        )}
        {t('submit')}
      </Button>

      <p className="sr-only">{businessName}</p>
    </form>
  );
}
