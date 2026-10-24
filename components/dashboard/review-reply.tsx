'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, MessageSquareReply } from 'lucide-react';

import { replyToReview } from '@/lib/reviews/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * The operator's public reply to one review. Saving an empty reply removes it.
 * One reply per review, shown under it on the listing.
 */
export function ReviewReply({ reviewId, initialReply }: { reviewId: string; initialReply: string | null }) {
  const t = useTranslations('dashboardReviews');
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(replyToReview, {});

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <MessageSquareReply className="size-3.5" aria-hidden />
        {initialReply ? t('editReply') : t('reply')}
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={reviewId} />
      <Textarea
        name="reply"
        rows={4}
        maxLength={2000}
        defaultValue={initialReply ?? ''}
        placeholder={t('replyPlaceholder')}
        aria-label={t('reply')}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {t('publishReply')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t('cancel')}
        </Button>
        {state.success && <span className="text-sm text-success">{t('saved')}</span>}
        {state.error && <span className="text-sm text-destructive">{t('failed')}</span>}
      </div>
      <p className="text-xs text-muted-foreground">{t('replyHint')}</p>
    </form>
  );
}
