'use client';

import { useActionState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
}: {
  locale: Locale;
  source?: string;
}) {
  const t = useTranslations('home.newsletter');
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribe, {});

  if (state.subscribed) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
        <CheckCircle2 className="size-4" aria-hidden />
        {t('done')}
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value={source} />

      {/* Honeypot, matching the quote and contact forms. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="nl_hp">Leave this empty</label>
        <input id="nl_hp" name="et_hp_ref" type="text" tabIndex={-1} autoComplete="off" />
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
        className="h-12 flex-1 bg-card"
      />

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-12 bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {t('submit')}
      </Button>

      {state.error && (
        <p className="w-full text-sm text-destructive sm:order-last">{t(`error.${state.error}`)}</p>
      )}
    </form>
  );
}
