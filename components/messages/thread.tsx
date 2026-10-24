'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Loader2, Send } from 'lucide-react';

import { sendMessage, markThreadRead, type ThreadMessage } from '@/lib/leads/messages';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * One conversation between a traveller and an operator about an enquiry.
 *
 * The viewer's own messages sit on the right in the brand colour, the other
 * side's on the left. Opening the thread marks the other side's messages read.
 * Sending is optimistic only in the sense of clearing the box: the message
 * appears once the server has saved it, so nothing shown can fail silently.
 */
export function Thread({
  leadBusinessId,
  viewer,
  otherName,
  initialMessages,
  token,
  className,
}: {
  leadBusinessId: string;
  viewer: 'traveler' | 'operator';
  otherName: string;
  initialMessages: ThreadMessage[];
  /** The enquiry's access key, for a traveller without an account. */
  token?: string;
  className?: string;
}) {
  const t = useTranslations('thread');
  const format = useFormatter();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  const unreadFromOther = initialMessages.some((m) => m.sender !== viewer && !m.readAt);
  useEffect(() => {
    if (unreadFromOther) void markThreadRead(leadBusinessId, token);
  }, [unreadFromOther, leadBusinessId, token]);

  function submit() {
    const body = draft.trim();
    if (!body || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await sendMessage(leadBusinessId, body, token);
      if (result.message) {
        setMessages((m) => [...m, result.message as ThreadMessage]);
        setDraft('');
        requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'nearest' }));
      } else {
        setError(t(result.error === 'tooMany' ? 'tooMany' : 'failed'));
      }
    });
  }

  return (
    <div className={cn('rounded-xl border bg-background', className)}>
      <div className="max-h-96 space-y-3 overflow-y-auto p-3 sm:p-4" aria-live="polite">
        {messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t(viewer === 'operator' ? 'emptyOperator' : 'emptyTraveler', { name: otherName })}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender === viewer;
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted',
                  )}
                >
                  <p className="whitespace-pre-line break-words">{m.body}</p>
                  <p
                    className={cn(
                      'mt-1 text-[11px]',
                      mine ? 'text-primary-foreground/75' : 'text-muted-foreground',
                    )}
                  >
                    {mine ? t('you') : otherName} ·{' '}
                    {format.dateTime(new Date(m.createdAt), { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form
        className="border-t p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor={`msg-${leadBusinessId}`}>
          {t('placeholder')}
        </label>
        <textarea
          id={`msg-${leadBusinessId}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={3}
          maxLength={4000}
          placeholder={t('placeholder')}
          className="w-full resize-y rounded-lg border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {error && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {t(viewer === 'operator' ? 'noteOperator' : 'noteTraveler', { name: otherName })}
          </p>
          <Button type="submit" size="sm" disabled={pending || !draft.trim()}>
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Send className="size-3.5" aria-hidden />}
            {pending ? t('sending') : t('send')}
          </Button>
        </div>
      </form>
    </div>
  );
}
