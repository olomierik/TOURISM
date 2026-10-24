'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, BadgeCheck, Loader2 } from 'lucide-react';

import { submitInvitedReview, type InvitedReviewState } from '@/lib/reviews/invite-actions';
import { RatingInput } from '@/components/reviews/review-form';
import { Link } from '@/i18n/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const initial: InvitedReviewState = {};

/** The review form behind an invitation link: no sign-in needed. */
export function InvitedReviewForm({
  token,
  businessName,
  businessSlug,
}: {
  token: string;
  businessName: string;
  businessSlug: string;
}) {
  const t = useTranslations('reviews');
  const tInvite = useTranslations('reviewInvite');
  const [state, formAction, pending] = useActionState(submitInvitedReview.bind(null, token), initial);

  if (state.success) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <BadgeCheck className="mx-auto size-10 text-success" aria-hidden />
        <h2 className="mt-3 text-xl font-semibold">{tInvite('thanksTitle')}</h2>
        <p className="mt-2 text-muted-foreground">
          {state.pending ? tInvite('thanksPending') : tInvite('thanksBody', { business: businessName })}
        </p>
        <Button asChild className="mt-5">
          <Link href={{ pathname: '/business/[slug]', params: { slug: businessSlug } }}>{tInvite('seeListing')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{tInvite(`errors.${state.error}`)}</AlertDescription>
        </Alert>
      )}

      <RatingInput label={t('rating')} />

      <div className="space-y-2">
        <Label htmlFor="invite-title">{t('titleField')}</Label>
        <Input id="invite-title" name="title" maxLength={120} placeholder={t('titlePlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-body">{t('body')}</Label>
        <Textarea
          id="invite-body"
          name="body"
          rows={6}
          minLength={20}
          maxLength={4000}
          required
          placeholder={tInvite('bodyPlaceholder', { business: businessName })}
        />
        <p className="text-xs text-muted-foreground">{t('bodyHint')}</p>
      </div>

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t('submitting')}
          </>
        ) : (
          tInvite('submit')
        )}
      </Button>
      <p className="text-xs text-muted-foreground">{tInvite('legal')}</p>
    </form>
  );
}
