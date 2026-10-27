'use client';

import { useActionState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';
import { subscribe, type NewsletterState } from '@/lib/newsletter/actions';

/**
 * Subscribe.
 *
 * Subscribing twice succeeds rather than erroring. The person pressed the
 * button because they want the newsletter, and "you are already subscribed" is
 * both a correction nobody asked for and a way of telling any stranger whether
 * a given address is on the list.
 */
export function NewsletterForm({
  locale,
  source = 'homepage',
  className,
}: {
  locale: Locale;
  source?: string;
  className?: string;
}) {
  const t = useTranslations('home.newsletter');
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribe, {});

  if (state.subscribed) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-caption font-medium text-success">
        <CheckCircle2 className="size-4" aria-hidden />
        {t('done')}
      </p>
    );
  }

  return (
    <form action={action} className={cn('flex gap-2', className)}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value={source} />

      {/* Honeypot (§6.3). No label text: "Leave this empty" is an instruction
          a screen reader will read out, and this field exists precisely so
          that nobody who can read the page ever fills it in. Off-screen rather
          than display:none, because a bot checks for the latter. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <input name="et_hp_ref" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label htmlFor="newsletter-email" className="sr-only">
        {t('label')}
      </label>
      <Input
        id="newsletter-email"
        name="email"
        type="email"
        required
        maxLength={160}
        autoComplete="email"
        placeholder={t('placeholder')}
        className="h-9 min-w-0 flex-1 bg-card text-caption"
      />

      {/* Icon-only submit. The form lives in a one-row footer now, and a
          labelled button is wider than the field it submits; the label stays
          for anyone who cannot see the arrow. */}
      <Button
        type="submit"
        size="icon"
        disabled={pending}
        className="size-9 shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <ArrowRight className="size-4" aria-hidden />
        )}
        <span className="sr-only">{t('submit')}</span>
      </Button>

      {state.error && (
        <p className="w-full text-caption text-destructive">{t(`error.${state.error}`)}</p>
      )}
    </form>
  );
}
