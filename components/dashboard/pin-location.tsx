'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Crosshair, Loader2, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

/**
 * Lets an operator pin their own location.
 *
 * 335 listings are placed from their town alone — from a city name, or from
 * the sorting office in a postal address — which puts them at a centroid that
 * can be twenty kilometres from the actual office. A further 73 cannot be
 * placed at all. Nobody can fix either from this end, because only the operator
 * knows where they are, and the cheapest way for them to say so is to stand in
 * the doorway and press a button.
 *
 * Two things this is careful about.
 *
 * It asks for permission at the moment the operator chooses to give it, with
 * the reason on screen, rather than on page load. A prompt that appears
 * unexplained is refused once and cannot be asked again in that browser.
 *
 * And the accuracy the browser reports is shown back. A reading good to eight
 * metres and a reading good to three kilometres both look like a pair of
 * numbers; only one of them is worth saving as an exact position, and the
 * operator is the one who can see whether they are standing where they mean to.
 */
export function PinLocation({
  latitude,
  longitude,
  precision,
  warnIfMissing = true,
}: {
  latitude: number | null;
  longitude: number | null;
  precision: 'exact' | 'city' | null;
  /**
   * Off on the sign-up form. "Your listing does not appear in near-me" is true
   * of a listing that exists and alarming nonsense on a form for one that does
   * not — the operator has not created anything yet to be missing from.
   */
  warnIfMissing?: boolean;
}) {
  const t = useTranslations('dashboard.location');

  const [lat, setLat] = useState(latitude);
  const [lng, setLng] = useState(longitude);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [state, setState] = useState<'idle' | 'asking' | 'denied' | 'unsupported'>('idle');

  function pin() {
    if (!('geolocation' in navigator)) {
      setState('unsupported');
      return;
    }
    setState('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setAccuracy(Math.round(pos.coords.accuracy));
        setState('idle');
      },
      () => setState('denied'),
      // GPS rather than the wifi estimate: this coordinate is stored and shown
      // to travellers, so it is worth the extra seconds and battery.
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }

  // Only claim exactness for a position the operator just set, or one that was
  // already exact. Saving a city centroid as 'exact' would relabel a guess.
  const willBeExact = accuracy !== null || precision === 'exact';

  return (
    <div className="space-y-2">
      <Label>{t('label')}</Label>

      <input type="hidden" name="latitude" value={lat ?? ''} />
      <input type="hidden" name="longitude" value={lng ?? ''} />
      <input type="hidden" name="locationPrecision" value={willBeExact ? 'exact' : ''} />

      <div className="rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={pin} disabled={state === 'asking'}>
            {state === 'asking' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Crosshair className="size-4" aria-hidden />
            )}
            {state === 'asking' ? t('asking') : lat === null ? t('pin') : t('repin')}
          </Button>

          {lat !== null && lng !== null && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 text-primary" aria-hidden />
              <span className="font-mono tabular-nums">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </span>
            </span>
          )}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t('hint')}</p>

        {accuracy !== null && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-accent">
            <Check className="size-3.5" aria-hidden />
            {t('accuracy', { metres: accuracy })}
          </p>
        )}

        {/* Said plainly, because it is the difference between a traveller being
            told "2.1 km away" and being told "in Arusha". */}
        {lat !== null && !willBeExact && (
          <p className="mt-2 text-xs text-muted-foreground">{t('currentlyApproximate')}</p>
        )}

        {/* The stronger case, and the one worth stating first: 73 approved
            listings have no location at all, which means they are not in the
            near-me results — not ranked low, absent. An operator cannot weigh
            that up if nobody tells them. */}
        {lat === null && warnIfMissing && (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-medium">
            {/* The icon carries the signal. --warning is the gold, which is
                unreadable as text on a light card and inverts in dark mode, so
                the text stays on the normal foreground token and the triangle
                does the work. */}
            <AlertTriangle className="mt-px size-3.5 shrink-0 text-warning" aria-hidden />
            {t('missing')}
          </p>
        )}

        {state === 'denied' && <p className="mt-2 text-xs text-destructive">{t('denied')}</p>}
        {state === 'unsupported' && (
          <p className="mt-2 text-xs text-destructive">{t('unsupported')}</p>
        )}
      </div>
    </div>
  );
}
