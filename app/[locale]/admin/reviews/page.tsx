import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Star } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { getAdminReviews } from '@/lib/queries/admin';
import { ReviewActions } from '@/components/admin/moderation-actions';
import { Badge } from '@/components/ui/badge';

export default async function AdminReviewsPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [reviews, t, format] = await Promise.all([
    getAdminReviews(),
    getTranslations('admin'),
    getFormatter(),
  ]);

  if (reviews.length === 0) {
    return (
      <div className="flex min-h-[30svh] flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center">
        <Star className="size-8 text-muted-foreground" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">{t('reviewsEmpty')}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.status === 'published' ? 'verified' : 'secondary'}>
                  {r.status}
                </Badge>
                <span className="flex items-center gap-1 text-sm">
                  <Star className="size-3.5 fill-warning text-warning" aria-hidden />
                  {r.rating}
                </span>
                <span className="text-xs uppercase text-muted-foreground">{r.locale}</span>
              </div>

              {r.title && <h2 className="mt-2 font-semibold">{r.title}</h2>}
              {r.body && (
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {r.body}
                </p>
              )}

              <p className="mt-3 text-sm text-muted-foreground">
                {t('reviewBy')} {r.authorName ?? r.authorEmail ?? '—'} · {t('reviewFor')}{' '}
                {r.businessName ?? '—'} · {format.relativeTime(new Date(r.createdAt))}
              </p>
            </div>

            <ReviewActions reviewId={r.id} status={r.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}
