'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Check, EyeOff, X } from 'lucide-react';

import { moderateReview, setGuideStatus, setPlatformSetting } from '@/lib/admin/actions';
import { Button } from '@/components/ui/button';

export function ReviewActions({
  reviewId,
  status,
}: {
  reviewId: string;
  status: string;
}) {
  const t = useTranslations('admin');
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {status !== 'published' && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => void moderateReview(reviewId, 'published'))}
        >
          <Check className="size-3.5" aria-hidden />
          {t('publish')}
        </Button>
      )}
      {status !== 'rejected' && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => startTransition(() => void moderateReview(reviewId, 'rejected'))}
        >
          <X className="size-3.5" aria-hidden />
          {t('rejectReview')}
        </Button>
      )}
    </div>
  );
}

export function GuideActions({ guideId, status }: { guideId: string; status: string }) {
  const t = useTranslations('admin');
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {status !== 'published' ? (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => void setGuideStatus(guideId, 'published'))}
        >
          <Check className="size-3.5" aria-hidden />
          {t('publishGuide')}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => startTransition(() => void setGuideStatus(guideId, 'draft'))}
        >
          <EyeOff className="size-3.5" aria-hidden />
          {t('unpublishGuide')}
        </Button>
      )}
      {status !== 'archived' && (
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          disabled={pending}
          onClick={() => startTransition(() => void setGuideStatus(guideId, 'archived'))}
        >
          {t('archiveGuide')}
        </Button>
      )}
    </div>
  );
}

/**
 * Boolean platform setting.
 *
 * Optimistic, because a settings toggle that lags feels broken — and reverted
 * from the server result if the write is refused.
 */
export function SettingToggle({
  settingKey,
  initial,
}: {
  settingKey: string;
  initial: boolean;
}) {
  const t = useTranslations('admin');
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant={initial ? 'default' : 'outline'}
      disabled={pending}
      aria-pressed={initial}
      onClick={() =>
        startTransition(() => void setPlatformSetting(settingKey, !initial))
      }
    >
      {initial ? t('settingOn') : t('settingOff')}
    </Button>
  );
}
