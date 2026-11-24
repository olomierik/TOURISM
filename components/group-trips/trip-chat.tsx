'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Send } from 'lucide-react';

import { useRouter } from '@/i18n/navigation';
import { postDepartureMessage, type ChatState } from '@/lib/group-trips/chat-actions';
import { Button } from '@/components/ui/button';

/**
 * The box under a group trip's chat. The messages above it are rendered on
 * the server; this refreshes them every 20 seconds while the page is open,
 * which is enough for "meet at 7 at the bus stand" and needs no socket.
 */
export function TripChatBox({ departureId, slug }: { departureId: string; slug: string }) {
  const t = useTranslations('groupTrips.chat');
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ChatState, FormData>(postDepartureMessage.bind(null, departureId, slug), {});

  useEffect(() => {
    if (state.success) {
      form.current?.reset();
      router.refresh();
    }
  }, [state, router]);
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <form ref={form} action={action} className="flex gap-2">
      <textarea
        name="body"
        required
        rows={2}
        maxLength={2000}
        placeholder={t('placeholder')}
        className="min-h-11 flex-1 resize-y rounded-xl border bg-background px-3 py-2 text-body-sm outline-none focus:border-primary"
      />
      <Button type="submit" className="self-end" disabled={pending} aria-label={t('send')}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
      </Button>
      {state.error && <p className="sr-only" role="alert">{t(`errors.${state.error}`)}</p>}
    </form>
  );
}
