'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';

import { submitForReview } from '@/lib/dashboard/actions';
import { Button } from '@/components/ui/button';

export function SubmitForReviewButton({ businessId }: { businessId: string }) {
  const t = useTranslations('dashboard');
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => void submitForReview(businessId))}
    >
      {pending ? (
        t('submitting')
      ) : (
        <>
          <Send className="size-3.5" aria-hidden />
          {t('draftCta')}
        </>
      )}
    </Button>
  );
}
