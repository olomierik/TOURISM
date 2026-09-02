import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { Camera, MessageSquare, ThumbsUp } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { ModerationButtons } from '@/components/admin/moderation-buttons';

export const dynamic = 'force-dynamic';

/**
 * The queue for anything a stranger wrote or uploaded.
 *
 * Anonymous comments and every traveller photograph wait here. That is the
 * whole reason those two things could be offered at all: an open comment box
 * and an open image upload on a public site are only safe if somebody looks
 * before the rest of the world does.
 *
 * Which means this page is not optional furniture — if it goes unread, the
 * feature it guards is a form that silently swallows what people write.
 */
export default async function AdminEngagementPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const [{ data: comments }, { data: photos }, t] = await Promise.all([
    supabase
      .from('business_comments')
      .select('id, author_name, body, is_recommendation, created_at, businesses (name, slug)')
      .eq('status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(100),
    supabase
      .from('traveler_photos')
      .select('id, public_url, caption, created_at, businesses (name, slug), profiles (full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(60),
    getTranslations({ locale, namespace: 'admin.engagement' }),
  ]);

  const pendingComments = comments ?? [];
  const pendingPhotos = photos ?? [];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('subtitle')}</p>
      </header>

      <section>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <MessageSquare className="size-5 text-primary" aria-hidden />
          {t('comments', { count: pendingComments.length })}
        </h2>

        {pendingComments.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            {t('noComments')}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pendingComments.map((c) => {
              const b = c.businesses as { name: string; slug: string } | null;
              return (
                <li key={c.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{c.author_name}</span>
                    {c.is_recommendation && (
                      <Badge variant="secondary" className="gap-1">
                        <ThumbsUp className="size-3" aria-hidden />
                        {t('recommends')}
                      </Badge>
                    )}
                    <span className="text-muted-foreground">{t('on')}</span>
                    {b && (
                      <Link
                        href={{ pathname: '/business/[slug]', params: { slug: b.slug } }}
                        className="font-medium hover:underline"
                      >
                        {b.name}
                      </Link>
                    )}
                    <time
                      dateTime={c.created_at}
                      className="ml-auto text-xs text-muted-foreground tabular-nums"
                    >
                      {new Date(c.created_at).toLocaleDateString(locale)}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{c.body}</p>
                  <ModerationButtons kind="comment" id={c.id} className="mt-3" />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Camera className="size-5 text-primary" aria-hidden />
          {t('photos', { count: pendingPhotos.length })}
        </h2>

        {pendingPhotos.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            {t('noPhotos')}
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingPhotos.map((p) => {
              const b = p.businesses as { name: string; slug: string } | null;
              const who = (p.profiles as unknown as { full_name: string | null } | null)?.full_name;
              return (
                <li key={p.id} className="overflow-hidden rounded-xl border">
                  {/* Unoptimised on purpose. Routing an unreviewed image through
                      the image optimiser would cache it on our own CDN before
                      anybody has decided it should exist. */}
                  <div className="relative aspect-[4/3] bg-secondary">
                    <Image
                      src={p.public_url}
                      alt={p.caption ?? ''}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-medium">{b?.name ?? '—'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('by', { name: who ?? '—' })}
                    </p>
                    {p.caption && <p className="mt-2 text-sm">{p.caption}</p>}
                    <ModerationButtons kind="photo" id={p.id} className="mt-3" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
