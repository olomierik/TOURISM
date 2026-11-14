'use client';

import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';

import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { useSessionUser } from '@/components/auth/use-session-user';
import { toggleFavorite } from '@/lib/leads/favorites';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics/track';

export function FavoriteButton({
  businessId,
  packageId,
  initialSaved = false,
  className,
  showLabel = false,
}: {
  businessId?: string;
  packageId?: string;
  /**
   * The saved state when the caller already knows it.
   *
   * Omit it on a public page. Resolving it on the server means reading the
   * session, and that means cookies(), which makes the whole route dynamic —
   * on the listing page that one call cost every listing its prerender. Left
   * out, the heart asks the browser for its own state after hydration.
   */
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
  const user = useSessionUser();

  // Fill the heart in for a reader who saved this before, when the caller did
  // not already know. Only when signed in, and only when the caller stayed
  // silent: a `false` passed deliberately by a dynamic page is an answer, not
  // an absence, and must not be second-guessed here.
  const resolveSaved = initialSaved === undefined;
  const favId = businessId ?? packageId;
  const favColumn = businessId ? 'business_id' : 'package_id';
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!resolveSaved || !userId || !favId) return;
    let active = true;
    // RLS scopes `favorites` to the reader's own rows. A failure leaves the
    // heart empty, which is what the page showed before and costs the reader
    // only a redundant save.
    createClient()
      .from('favorites')
      .select('id')
      .eq('profile_id', userId)
      .eq(favColumn, favId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setSaved(true);
      });
    return () => {
      active = false;
    };
  }, [resolveSaved, userId, favId, favColumn]);
  const [pending, startTransition] = useTransition();

  function onClick() {
    // Optimistic: saving something should feel instant. Reverted below if the
    // server disagrees, which in practice only happens when the session expired.
    const next = !saved;
    setSaved(next);

    startTransition(async () => {
      const result = await toggleFavorite({ businessId, packageId });
      // Only on a real save. Recording the un-save too would inflate the
      // number with people changing their minds.
      if (result?.saved) track('save_clicked', { businessId: businessId ?? null });

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
      size={showLabel ? 'default' : 'icon'}
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
