'use client';

import { useActionState, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, Check, Loader2, Star } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { submitReview, type ReviewState } from '@/lib/reviews/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const initial: ReviewState = {};

/**
 * Star input.
 *
 * Radio inputs rather than buttons, so the control is keyboard-navigable with
 * arrow keys, announces itself as a single choice to a screen reader, and
 * submits with the form without any JavaScript holding the value.
 */
function RatingInput({ label }: { label: string }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">
        {label}
        <span className="ml-1 text-destructive">*</span>
      </legend>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="cursor-pointer p-0.5"
            onMouseEnter={() => setHover(n)}
          >
            <input
              type="radio"
              name="rating"
              value={n}
              checked={value === n}
              onChange={() => setValue(n)}
              className="sr-only"
              required
            />
            <Star
              className={cn(
                'size-7 transition-colors',
                n <= shown ? 'fill-warning text-warning' : 'text-muted-foreground/40',
              )}
              aria-hidden
            />
            <span className="sr-only">{n}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ReviewForm({
  businessId,
  signedIn,
}: {
  businessId: string;
  signedIn: boolean;
}) {
  const t = useTranslations('reviews');
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(submitReview, initial);

  if (!signedIn) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-muted-foreground">{t('signInPrompt')}</p>
        <Button asChild className="mt-4">
          <Link href="/login">{t('signIn')}</Link>
        </Button>
      </div>
    );
  }

  if (state.success) {
    return (
      <Alert>
        <Check className="size-4" aria-hidden />
        <AlertDescription>
          {state.pending ? t('submittedPending') : t('submitted')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-5 rounded-xl border bg-card p-6">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="locale" value={locale} />

      <h3 className="font-display text-lg font-semibold">{t('writeTitle')}</h3>

      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{t(`errors.${state.error}`)}</AlertDescription>
        </Alert>
      )}

      <RatingInput label={t('rating')} />

      <div className="space-y-2">
        <Label htmlFor="review-title">{t('titleField')}</Label>
        <Input id="review-title" name="title" maxLength={120} placeholder={t('titlePlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-body">{t('body')}</Label>
        <Textarea
          id="review-body"
          name="body"
          rows={5}
          maxLength={2000}
          placeholder={t('bodyPlaceholder')}
        />
        <p className="text-xs text-muted-foreground">{t('bodyHint')}</p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t('submitting')}
          </>
        ) : (
          t('submit')
        )}
      </Button>
    </form>
  );
}
