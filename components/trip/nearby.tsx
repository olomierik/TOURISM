'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { Crosshair } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/routing';
import { nearbyResults } from '@/lib/trip/near-action';
import { track } from '@/lib/analytics/track';
import { cn } from '@/lib/utils';

type Anchor = { name: string; lat: number; lng: number };

/**
 * "What is around me."
 *
 * Three things this has to get right, and none of them is the list.
 *
 * The permission prompt is explained before it appears. A browser dialog that
 * arrives unannounced on page load is refused by most people and cannot be
 * asked again, so the button says what it is for and the reader presses it.
 *
 * The position is rounded here, before it leaves the machine, and goes through
 * a server action rather than a URL. Two decimal places is a little over a
 * kilometre — enough to answer "what is nearby", not enough to be a record of
 * where somebody is. Nothing is stored.
 *
 * And the results come back as an element rather than as rows, because the
 * cards are async server components and cannot render inside this file. That
 * is why the state below is a ReactNode.
 *
 * A refusal is not a dead end: the destination chips do the same job from a
 * place the reader picks, which is also what somebody planning from home wants.
 */
export function Nearby({
  anchors,
  locale,
}: {
  /** Destinations to search from when geolocation is refused or unavailable. */
  anchors: Anchor[];
  locale: Locale;
}) {
  const t = useTranslations('nearMe');
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<ReactNode>(null);
  const [from, setFrom] = useState<Anchor | null>(null);
  const [usedLocation, setUsedLocation] = useState(false);
  const [radius, setRadius] = useState(50);
  const [denied, setDenied] = useState(false);

  const RADII = [25, 50, 100, 200];

  function search(lat: number, lng: number, place: string, km: number) {
    startTransition(async () => {
      setResults(await nearbyResults(lat, lng, km, locale, place));
    });
  }

  function fromAnchor(a: Anchor, km = radius) {
    setFrom(a);
    setUsedLocation(false);
    search(a.lat, a.lng, a.name, km);
  }

  function locate(km = radius) {
    if (!('geolocation' in navigator)) {
      setDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDenied(false);
        setFrom(null);
        setUsedLocation(true);
        // Rounded before it leaves the browser. The action rounds again, but
        // this is the rounding that matters — it is the only place the precise
        // value ever exists.
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lng = Math.round(pos.coords.longitude * 100) / 100;
        track('search_started', { tool: 'near_me' });
        search(lat, lng, t('yourLocation'), km);
      },
      () => setDenied(true),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <div>
      <div className="rounded-xl border p-5">
        <Button type="button" onClick={() => locate()} disabled={pending}>
          <Crosshair className="size-4" aria-hidden />
          {pending && usedLocation ? t('locating') : t('useMyLocation')}
        </Button>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t('privacy')}</p>
        {denied && <p className="mt-2 text-sm">{t('denied')}</p>}
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium">{t('orPick')}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {anchors.map((a) => (
            <button
              key={a.name}
              type="button"
              onClick={() => fromAnchor(a)}
              aria-pressed={from?.name === a.name}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                from?.name === a.name
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-secondary',
              )}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {(results || pending) && (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-end gap-1.5 border-b pb-3">
            {RADII.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => {
                  setRadius(km);
                  // Re-searching from a chip is free. Re-asking the browser for
                  // a position is not, so widening after "my location" goes
                  // back through the prompt rather than reusing a coordinate
                  // this component deliberately did not keep.
                  if (from) fromAnchor(from, km);
                  else if (usedLocation) locate(km);
                }}
                aria-pressed={radius === km}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs tabular-nums transition-colors',
                  radius === km
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'hover:bg-secondary',
                )}
              >
                {t('km', { km })}
              </button>
            ))}
          </div>

          {/* Heading and grid together, because they arrive together — the
              action returns one element rendered on the server. */}
          <div className={cn('mt-6', pending && 'opacity-50')}>{results}</div>
        </>
      )}
    </div>
  );
}
