import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { BadgeCheck, Star } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyBusiness } from '@/lib/queries/dashboard';
import { ReviewReply } from '@/components/dashboard/review-reply';

/**
 * The operator's reviews, newest first, each with a public reply. Replying
 * to reviews, good and bad, is what travellers read as an operator who
 * cares; it is the one lever an operator has on a review.
 */
export default async function DashboardReviewsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const business = await getMyBusiness(locale);
  // No listing yet: setup is on the dashboard itself, not a 404.
  if (!business) return redirect({ href: '/dashboard', locale });

  const t = await getTranslations('dashboardReviews');
  const tReviews = await getTranslations('reviews');
  const format = await getFormatter();

  // RLS lets an owner read every review of their own business, pending ones
  // included.
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from('reviews')
    .select(
      'id, rating, title, body, status, created_at, is_verified_enquiry, is_verified_booking, owner_reply, profiles!reviews_author_id_fkey (full_name)',
    )
    .eq('business_id', business.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const list = reviews ?? [];
  const unanswered = list.filter((r) => !r.owner_reply).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {list.length === 0 ? t('emptyIntro') : t('intro', { count: list.length, unanswered })}
        </p>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('empty')}
        </p>
      ) : (
        <ul className="space-y-4">
          {list.map((r) => {
            const name = (r.profiles as { full_name: string | null } | null)?.full_name?.trim().split(/\s+/)[0];
            return (
              <li key={r.id} className="rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="flex items-center gap-0.5" aria-label={t('stars', { count: r.rating })}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={i < r.rating ? 'size-4 fill-warning text-warning' : 'size-4 text-muted-foreground/40'}
                        aria-hidden
                      />
                    ))}
                  </span>
                  <span className="font-medium">{name ?? tReviews('anonymous')}</span>
                  <span className="text-muted-foreground">
                    {format.dateTime(new Date(r.created_at), { dateStyle: 'medium' })}
                  </span>
                  {r.is_verified_booking ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-xs font-medium text-success">
                      <BadgeCheck className="size-3.5" aria-hidden />
                      {tReviews('verifiedTraveller')}
                    </span>
                  ) : r.is_verified_enquiry ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-xs font-medium text-success">
                      <BadgeCheck className="size-3.5" aria-hidden />
                      {tReviews('verifiedEnquiry')}
                    </span>
                  ) : null}
                  {r.status !== 'published' && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t('pendingModeration')}</span>
                  )}
                </div>
                {r.title && <h2 className="mt-3 font-semibold">{r.title}</h2>}
                {r.body && <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{r.body}</p>}

                {r.owner_reply && (
                  <div className="mt-4 rounded-lg border-l-2 border-primary bg-secondary/50 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {tReviews('ownerReply')}
                    </p>
                    <p className="mt-1 whitespace-pre-line">{r.owner_reply}</p>
                  </div>
                )}
                <div className="mt-4">
                  <ReviewReply reviewId={r.id} initialReply={r.owner_reply} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
