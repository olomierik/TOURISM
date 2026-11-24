import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { MessagesSquare } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link, getPathname } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDepartureBySlug } from '@/lib/group-trips/departures';
import { Button } from '@/components/ui/button';
import { TripChatBox } from '@/components/group-trips/trip-chat';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type Params = Promise<{ locale: Locale; slug: string }>;

/**
 * One group trip's chat, for its guide and the travellers who booked it.
 * The database answers who may read (departure_messages_read); everyone else
 * is told how to get in, not shown anything.
 */
export default async function TripChatPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const d = await getDepartureBySlug(slug);
  if (!d) notFound();
  const [t, format] = await Promise.all([getTranslations('groupTrips.chat'), getFormatter()]);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const here = getPathname({ href: { pathname: '/group-trips/[slug]/chat', params: { slug } }, locale });
  const { data: member } = user ? await supabase.rpc('is_departure_member', { p_departure: d.id }) : { data: false };
  const { data: messages } = member
    ? await supabase
        .from('departure_messages')
        .select('id, author_id, author_name, is_guide, body, created_at')
        .eq('departure_id', d.id)
        .order('created_at')
        .limit(500)
    : { data: [] };

  return (
    <div className="container-page max-w-3xl py-6 sm:py-10">
      <p className="text-body-sm text-muted-foreground">
        <Link href={{ pathname: '/group-trips/[slug]', params: { slug } }} className="hover:text-primary">
          {d.title}
        </Link>
      </p>
      <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold">
        <MessagesSquare className="size-6 text-primary" aria-hidden />
        {t('title')}
      </h1>
      <p className="mt-1 text-body-sm text-muted-foreground">{t('lead', { guide: d.guide.name })}</p>

      {!user ? (
        <div className="mt-6 rounded-2xl border p-5">
          <p>{t('signIn')}</p>
          <Button asChild className="mt-3">
            <a href={`${getPathname({ href: '/login', locale })}?next=${encodeURIComponent(here)}`}>{t('signInCta')}</a>
          </Button>
        </div>
      ) : !member ? (
        <div className="mt-6 rounded-2xl border p-5">
          <p>{t('notMember')}</p>
          <Button asChild variant="outline" className="mt-3">
            <Link href={{ pathname: '/group-trips/[slug]', params: { slug } }}>{t('seeTrip')}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border bg-card">
          <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
            {(messages ?? []).length === 0 && <p className="py-6 text-center text-body-sm text-muted-foreground">{t('empty')}</p>}
            {(messages ?? []).map((m) => {
              const mine = m.author_id === user.id;
              return (
                <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-body-sm', mine ? 'rounded-br-md bg-primary text-primary-foreground' : m.is_guide ? 'rounded-bl-md bg-primary-subtle' : 'rounded-bl-md bg-muted')}>
                    {!mine && (
                      <p className="mb-0.5 text-caption font-semibold">
                        {m.author_name}
                        {m.is_guide && ` · ${t('guide')}`}
                      </p>
                    )}
                    <p className="whitespace-pre-line break-words">{m.body}</p>
                    <p className={cn('mt-1 text-[11px]', mine ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
                      {format.dateTime(new Date(m.created_at), { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t p-3">
            <TripChatBox departureId={d.id} slug={slug} />
            <p className="mt-2 text-caption text-muted-foreground">{t('note')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
