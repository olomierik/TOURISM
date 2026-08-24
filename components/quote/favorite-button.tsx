'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';

import { useRouter } from '@/i18n/navigation';
import { toggleFavorite } from '@/lib/leads/favorites';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FavoriteButton({
  businessId,
  packageId,
  initialSaved = false,
  className,
  showLabel = false,
}: {
  businessId?: string;
  packageId?: string;
  initialSaved?: boolean;
  className?: string;
  /**
   * Render the label beside the heart.
   *
   * Icon-only is right on a card, where the heart sits over a photograph and
   * every listing has one so the pattern reads itself. It is wrong on a contact
   * rail beneath a full-width "Request a quote", where an unlabelled stretched
   * heart is just a mystery control.
   */
  showLabel?: boolean;
}) {
  const t = useTranslations('favorites');
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function onClick() {
    // Optimistic: saving something should feel instant. Reverted below if the
    // server disagrees, which in practice only happens when the session expired.
    const next = !saved;
    setSaved(next);

    startTransition(async () => {
      const result = await toggleFavorite({ businessId, packageId });

      if (result.requiresLogin) {
        setSaved(false);
        router.push('/login');
        return;
      }

      setSaved(result.saved);
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? 'lg' : 'icon'}
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? t('remove') : t('add')}
      className={className}
    >
      <Heart
        className={cn('size-4 transition-colors', saved && 'fill-destructive text-destructive')}
        aria-hidden
      />
      {showLabel && (saved ? t('remove') : t('add'))}
    </Button>
  );
}
