'use client';

import { useActionState, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { saveTrip, type SaveTripState } from '@/lib/trip/actions';
import type { Style } from '@/lib/trip/cost';

/**
 * Saving a trip to an account.
 *
 * Deliberately secondary to the share link, which is above it and works for
 * everyone. Most people planning a trip are not signed in and will not sign in
 * to keep one — a URL they can paste into a message does the job. This is for
 * the smaller case the URL cannot serve: several trips being compared over
 * weeks, from more than one device.
 *
 * So a signed-out visitor is shown where the button leads rather than the
 * button. Presenting a control that fails on click and then asks for an account
 * is the pattern that makes people distrust the next control.
 */
export function SaveTrip({
  stops,
  style,
  travellers,
  isSignedIn,
}: {
  /** `serengeti:4,ngorongoro:2` — the same encoding the share link uses. */
  stops: string;
  style: Style;
  travellers: number;
  isSignedIn: boolean;
}) {
  const t = useTranslations('tripCost');
  const [state, action, pending] = useActionState<SaveTripState, FormData>(saveTrip, {});
  const [naming, setNaming] = useState(false);

  if (!isSignedIn) {
    return (
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {t.rich('saveSignedOut', {
          link: (chunks) => (
            <Link href="/login" className="font-medium text-primary hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    );
  }

  if (state.savedId) {
    return (
      <p className="mt-3 flex items-center justify-center gap-1.5 text-sm">
        <BookmarkCheck className="size-4 text-primary" aria-hidden />
        {t.rich('saved', {
          link: (chunks) => (
            <Link href="/account/trips" className="font-medium text-primary hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    );
  }

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="stops" value={stops} />
      <input type="hidden" name="style" value={style} />
      <input type="hidden" name="travellers" value={String(travellers)} />

      {naming ? (
        <div className="space-y-2">
          {/* Optional. A trip saved without a name shows its stops, which is
              more use than "Trip 3" invented on somebody's behalf. */}
          <Input
            name="name"
            maxLength={80}
            placeholder={t('namePlaceholder')}
            aria-label={t('nameLabel')}
            autoFocus
          />
          <Button type="submit" variant="outline" className="w-full" disabled={pending}>
            {pending ? t('saving') : t('saveConfirm')}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setNaming(true)}
        >
          <Bookmark className="size-4" aria-hidden />
          {t('save')}
        </Button>
      )}

      {state.error && (
        <p className="mt-2 text-center text-xs text-destructive">
          {t(`saveError.${state.error}`)}
        </p>
      )}
    </form>
  );
}
