'use client';

import { useActionState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendContactMessage, type ContactState } from '@/lib/contact/actions';
import type { Locale } from '@/i18n/routing';

const TOPICS = ['general', 'correction', 'takedown', 'privacy', 'press', 'bug'] as const;

/**
 * The contact form.
 *
 * It sits below two links that send most people somewhere better — a traveller
 * wanting a quote, an operator wanting to claim a listing — so what arrives
 * here is the genuine remainder: corrections, takedown requests, data requests,
 * press, bugs.
 *
 * The topic selector is not decoration. A correction report and a privacy
 * request need different handling and different urgency, and asking once at
 * submit time is cheaper than an admin inferring it from prose later.
 */
export function ContactForm({
  locale,
  sourceUrl,
}: {
  locale: Locale;
  /** The page they came from, so a correction report says which one. */
  sourceUrl: string | null;
}) {
  const t = useTranslations('contact');
  const [state, action, pending] = useActionState<ContactState, FormData>(
    sendContactMessage,
    {},
  );

  if (state.sent) {
    return (
      <div className="rounded-2xl border p-6">
        <p className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-5 text-primary" aria-hidden />
          {t('sentTitle')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('sentBody')}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 rounded-2xl border p-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="sourceUrl" value={sourceUrl ?? ''} />

      {/* Honeypot, matching the quote form. Hidden from people, irresistible
          to the kind of bot that fills every field it finds. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="et_hp_ref">Leave this empty</label>
        <input id="et_hp_ref" name="et_hp_ref" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="topic">{t('topicLabel')}</Label>
        <select
          id="topic"
          name="topic"
          defaultValue="general"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        >
          {TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {t(`topic.${topic}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">{t('nameLabel')}</Label>
          <Input id="name" name="name" autoComplete="name" minLength={2} maxLength={80} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t('emailLabel')}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">{t('messageLabel')}</Label>
        <Textarea
          id="message"
          name="message"
          rows={6}
          minLength={20}
          maxLength={4000}
          required
          placeholder={t('messagePlaceholder')}
        />
        <p className="text-xs text-muted-foreground">{t('messageHint')}</p>
      </div>

      {state.error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {t(`error.${state.error}`)}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        <Send className="size-4" aria-hidden />
        {pending ? t('sending') : t('send')}
      </Button>
    </form>
  );
}
