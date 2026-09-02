'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';

import { moderateEngagement } from '@/lib/engagement/moderation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Approve or reject one pending comment or photograph.
 *
 * The row is hidden the moment a decision is taken rather than after the round
 * trip finishes: a moderator working through a queue of sixty is clicking
 * faster than a request to Ireland completes, and a list that only reorders
 * after each response makes them lose their place — or approve the same item
 * twice because it had not moved yet.
 */
export function ModerationButtons({
  kind,
  id,
  className,
}: {
  kind: 'comment' | 'photo';
  id: string;
  className?: string;
}) {
  const t = useTranslations('admin.engagement');
  const [decided, setDecided] = useState<'published' | 'rejected' | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(status: 'published' | 'rejected') {
    setDecided(status);
    startTransition(async () => {
      const result = await moderateEngagement(kind, id, status);
      // Put it back if the server refused, so a failure is visible rather than
      // silently swallowed by an optimistic hide.
      if (!result.ok) setDecided(null);
    });
  }

  if (decided) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        {decided === 'published' ? t('approved') : t('rejected')}
      </p>
    );
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <Button type="button" size="sm" disabled={pending} onClick={() => decide('published')}>
        <Check className="size-4" aria-hidden />
        {t('approve')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => decide('rejected')}
      >
        <X className="size-4" aria-hidden />
        {t('reject')}
      </Button>
    </div>
  );
}
