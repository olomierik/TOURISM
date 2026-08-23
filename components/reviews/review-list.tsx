import { getTranslations } from 'next-intl/server';
import { BadgeCheck, Star } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export type PublicReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  is_verified_enquiry: boolean;
  owner_reply: string | null;
  owner_replied_at: string | null;
  profiles: { full_name: string | null } | null;
};

/** Read-only star row. */
export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn('inline-flex', className)} aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            'size-4',
            n <= Math.round(rating) ? 'fill-warning text-warning' : 'text-muted-foreground/30',
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}

/**
 * Published reviews for a business, newest first.
 *
 * Reviews backed by an enquiry sent through the platform carry a mark; the rest
 * do not. Showing the distinction rather than hiding unverified reviews is the
 * point of the change that opened reviewing up — the reader gets to weigh the
 * evidence instead of being handed a filtered set with no explanation.
 *
 * Only the reviewer's first name is shown. A full name next to a public opinion
 * about a company is more exposure than someone leaving a review reasonably
 * expects, and it is not needed to make the review useful.
 */
export async function ReviewList({
  reviews,
  locale,
}: {
  reviews: PublicReview[];
  locale: Locale;
}) {
  const t = await getTranslations('reviews');

  if (!reviews.length) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        {t('empty')}
      </p>
    );
  }

  const fmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' });

  return (
    <ul className="space-y-5">
      {reviews.map((r) => {
        const firstName = r.profiles?.full_name?.trim().split(/\s+/)[0] ?? t('anonymous');

        return (
          <li key={r.id} className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Stars rating={r.rating} />
              <span className="text-sm font-medium">{firstName}</span>
              <span className="text-sm text-muted-foreground">
                {fmt.format(new Date(r.created_at))}
              </span>
              {r.is_verified_enquiry && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-xs font-medium text-success">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  {t('verifiedEnquiry')}
                </span>
              )}
            </div>

            {r.title && <h4 className="mt-3 font-semibold">{r.title}</h4>}
            {r.body && <p className="mt-2 leading-relaxed text-muted-foreground">{r.body}</p>}

            {r.owner_reply && (
              <div className="mt-4 rounded-lg border-l-2 border-primary bg-secondary/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('ownerReply')}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed">{r.owner_reply}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
