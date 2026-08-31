import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Mail } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { MarkHandledButton } from '@/components/admin/mark-handled';

/**
 * The contact inbox.
 *
 * This page is the reason the contact form is allowed to exist. A form that
 * writes rows nobody reads is worse than publishing an email address, because
 * it shows the sender a confirmation and then swallows the message — so the
 * form and the place it lands went in together.
 *
 * Unhandled first, because that is the only ordering an inbox has any use for.
 */
export default async function AdminMessagesPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const [{ data: messages }, t, format] = await Promise.all([
    // RLS restricts select on this table to admins, and the admin layout has
    // already gated the route — this is the second lock rather than the first.
    supabase
      .from('contact_messages')
      .select('id, topic, name, email, message, source_url, locale, handled_at, created_at')
      .order('handled_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false })
      .limit(200),
    getTranslations('admin'),
    getFormatter(),
  ]);

  const rows = messages ?? [];

  if (rows.length === 0) {
    return (
      <div className="flex min-h-[30svh] flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center">
        <Mail className="size-8 text-muted-foreground" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">{t('messagesEmpty')}</p>
      </div>
    );
  }

  const TOPICS = ['general', 'correction', 'takedown', 'privacy', 'press', 'bug'] as const;
  type Topic = (typeof TOPICS)[number];
  const topicLabel = (v: string) =>
    TOPICS.includes(v as Topic) ? t(`messageTopic.${v as Topic}`) : v;

  return (
    <ul className="space-y-3">
      {rows.map((m) => (
        <li
          key={m.id}
          className="rounded-2xl border bg-card p-5 data-[handled=true]:opacity-60"
          data-handled={m.handled_at !== null}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={m.handled_at ? 'secondary' : 'verified'}>
                  {topicLabel(m.topic)}
                </Badge>
                {m.locale && (
                  <span className="text-xs uppercase text-muted-foreground">{m.locale}</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {format.dateTime(new Date(m.created_at), 'medium')}
                </span>
              </div>

              <p className="mt-2 font-medium">
                {m.name}{' '}
                <a
                  href={`mailto:${m.email}`}
                  className="font-normal text-primary hover:underline"
                >
                  {m.email}
                </a>
              </p>

              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{m.message}</p>

              {/* The page they were on. A correction report without it means
                  working out which of 1,329 listings is wrong from prose. */}
              {m.source_url && (
                <p className="mt-2 truncate text-xs text-muted-foreground">{m.source_url}</p>
              )}
            </div>

            <MarkHandledButton
              messageId={m.id}
              handled={m.handled_at !== null}
              markLabel={t('messageMarkHandled')}
              handledLabel={t('messageHandled')}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
