'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Square } from 'lucide-react';

import { endBoost } from '@/lib/admin/boosts';
import { Button } from '@/components/ui/button';

export function EndBoostButton({ id }: { id: string }) {
  const t = useTranslations('admin.boost');
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-muted-foreground"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t('endConfirm'))) return;
        startTransition(() => void endBoost(id));
      }}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Square className="size-3.5" aria-hidden />
      )}
      {t('end')}
    </Button>
  );
}
