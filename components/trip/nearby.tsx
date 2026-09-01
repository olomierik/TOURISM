'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { Crosshair } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { PinMap, type Pin } from '@/components/map/pin-map';
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
 * The position goes through a server action rather than a URL, so it never
 * reaches a query string, a route or a log line. Nothing is stored.
 *
 * The card list comes back as an element rather than as rows, because the
 * cards are async server components and cannot render inside this file. The
 * map comes back as data and is rendered here, because it is a client
 * component and one returned through an action cannot be resolved at all.
 *
 * A refusal is not a dead end: the destination chips do the same job from a
 * place the reader picks, which is also what somebody planning from home wants.
 */
type Results = {
  count: number;
  pins: Pin[];
  list: ReactNode;
  place: string;
  km: number;
  lat: number;
  lng: number;
};

export function Nearby({
  anchors,
  locale,
  initial,
}: {
  /** Destinations to search from when geolocation is refused or unavailable. */
  anchors: Anchor[];
  locale: Locale;
  /**
   * The opening set, rendered on the server by the page. It is what the reader
   * sees before pressing anything, and it is also what puts the card tree's
   * client components into this route's manifest — without it the action's
   * results cannot be resolved at all. See the page for the full reason.
   */
  initial: Results;
}) {
  const t = useTranslations('nearMe');
  const [pending, startTransition] = useTransition();
  // The map is rendered here rather than inside the element the action
  // returns. PinMap is a client component, and a client component reached only
  // through a server action's return value is not in the route's client
  // manifest — React cannot resolve it and the whole result lands in the error
  // boundary. Imported in this file it is part of the route's own client graph,
  // which is what makes it resolvable.
  const [results, setResults] = useState<Results | null>(initial);
  // The opening set came from a destination, so that chip starts selected —
  // the results on screen and the highlighted chip have to agree.
  const [from, setFrom] = useState<Anchor | null>(
    anchors.find((a) => a.name === initial.place) ?? null,
  );
  const [usedLocation, setUsedLocation] = useState(false);
  const [radius, setRadius] = useState(initial.km);
  const [denied, setDenied] = useState(false);

  const RADII = [25, 50, 100, 200];

  function search(lat: number, lng: number, place: string, km: number) {
    startTransition(async () => {
      const r = await nearbyResults(lat, lng, km, locale);
      // The origin is kept alongside the results rather than in the action's
      // response: it is what the map centres on and what the heading names,
      // and it never leaves this component except as one POST body.
      setResults({ ...r, place, km, lat, lng });
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

    const found = (pos: GeolocationPosition) => {
      setDenied(false);
      setFrom(null);
      setUsedLocation(true);
      // Passed through as reported. It used to be rounded to ~1km, which
      // protected nothing — the coordinate builds one query and is never
      // stored — while moving every result by up to a kilometre.
      track('search_started', { tool: 'near_me' });
      search(pos.coords.latitude, pos.coords.longitude, t('yourLocation'), km);
    };

    navigator.geolocation.getCurrentPosition(
      found,
      (err) => {
        // A refusal is final; a timeout is not. Asking for GPS makes timeouts
        // considerably more likely — a laptop indoors has no GPS to answer
        // with — and giving up there would make this button worse than it was
        // before, for the people it was already working for. So the second
        // attempt takes the network estimate, which is a few kilometres out
        // and still an answer.
        if (err.code === err.PERMISSION_DENIED) {
          setDenied(true);
          return;
        }
        navigator.geolocation.getCurrentPosition(found, () => setDenied(true), {
          enableHighAccuracy: false,
          timeout: 10_000,
          maximumAge: 300_000,
        });
      },
      // High accuracy asks for GPS rather than settling for the wifi and cell
      // estimate, which in a city can be several kilometres out — that was the
      // larger half of "near me is not accurate". It costs a little battery
      // and a few seconds, which is why the timeout is longer.
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 60_000 },
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

          <div className={cn('mt-6', pending && 'opacity-50')}>
            {results && (
              <>
                <h2 className="font-display text-xl font-semibold">
                  {results.count === 0
                    ? t('noneFound', { place: results.place, km: results.km })
                    : t('found', {
                        count: results.count,
                        place: results.place,
                        km: results.km,
                      })}
                </h2>

                {/* The map before the list, because "near me" is a question
                    about space and a list of names is a poor answer to it.
                    Listings placed from a town are drawn as a soft area rather
                    than a pin — the same distinction the labels below make in
                    words. */}
                {results.pins.length > 0 && (
                  <PinMap
                    pins={results.pins}
                    center={{ lat: results.lat, lng: results.lng }}
                    // `place` is already 'your location' or the chip's name.
                    you={{ lat: results.lat, lng: results.lng, label: results.place }}
                    label={t('mapLabel')}
                    className="mt-6"
                  />
                )}

                {results.list}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
