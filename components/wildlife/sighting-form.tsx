'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Crosshair, Loader2, MapPin, X } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { logSighting, type SightingState } from '@/lib/wildlife/actions';

type Option = { slug: string; name: string };

/**
 * "Log a sighting". Used on an animal's page (species fixed) and in the diary
 * (species chosen from the list). The location button asks the browser once,
 * on purpose, and only fills two hidden fields: nothing is sent until Save.
 */
export function SightingForm({
  species,
  options,
}: {
  /** Fixed animal, from its profile page. */
  species?: Option;
  /** Choice of animals, from the diary. */
  options?: Option[];
}) {
  const t = useTranslations('wildlife.form');
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locFailed, setLocFailed] = useState(false);
  const dateInput = useRef<HTMLInputElement>(null);

  // React resets an uncontrolled form after a successful action; the map
  // point lives in state, so it is cleared here alongside.
  const [state, action, pending] = useActionState<SightingState, FormData>(
    async (prev, formData) => {
      const result = await logSighting(prev, formData);
      if (result.success) setPoint(null);
      return result;
    },
    {},
  );

  // The date default is the reader's own day, which the server cannot know.
  // Written to the DOM rather than state: `defaultValue` is also what a form
  // reset restores, so the next sighting starts on today again.
  useEffect(() => {
    const el = dateInput.current;
    if (!el) return;
    const d = new Date();
    const today = new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    el.max = today;
    el.defaultValue = today;
  }, []);

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setLocFailed(true);
      return;
    }
    setLocating(true);
    setLocFailed(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPoint({
          lat: Math.round(pos.coords.latitude * 1e5) / 1e5,
          lng: Math.round(pos.coords.longitude * 1e5) / 1e5,
        });
        setLocating(false);
      },
      () => {
        setLocFailed(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  };

  return (
    <form action={action} className="flex flex-col gap-4">
      {species ? (
        <input type="hidden" name="species" value={species.slug} />
      ) : (
        <Field label={t('species')} error={state.error === 'badSpecies' ? t('errors.badSpecies') : null}>
          {(p) => (
            <select
              {...p}
              name="species"
              required
              defaultValue=""
              className="h-12 w-full rounded-sm border-control bg-surface px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="" disabled>
                —
              </option>
              {options?.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label={t('seenOn')} error={state.error === 'badDate' ? t('errors.badDate') : null}>
          {(p) => (
            <Input {...p} ref={dateInput} type="date" name="seenOn" required />
          )}
        </Field>
        <Field label={t('place')} hint={t('placeHint')} optional>
          {(p) => <Input {...p} name="place" maxLength={120} autoComplete="off" />}
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="lat" value={point?.lat ?? ''} />
        <input type="hidden" name="lng" value={point?.lng ?? ''} />
        {point ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary-subtle px-3 py-1.5 text-body-sm font-medium text-foreground">
              <MapPin className="size-4 text-primary" aria-hidden />
              {t('locationSet', { lat: point.lat.toFixed(3), lng: point.lng.toFixed(3) })}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPoint(null)}>
              <X className="size-4" aria-hidden />
              {t('clearLocation')}
            </Button>
          </>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={locate} disabled={locating}>
            {locating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Crosshair className="size-4" aria-hidden />
            )}
            {locating ? t('locating') : t('useLocation')}
          </Button>
        )}
        {locFailed && <p className="w-full text-body-sm text-muted-foreground">{t('locationFailed')}</p>}
      </div>

      <Field label={t('notes')} hint={t('notesHint')} optional>
        {(p) => <Textarea {...p} name="notes" rows={3} maxLength={1000} />}
      </Field>

      <Field
        label={t('photo')}
        hint={t('photoHint')}
        optional
        error={
          state.error === 'tooLarge'
            ? t('errors.tooLarge')
            : state.error === 'wrongType'
              ? t('errors.wrongType')
              : null
        }
      >
        {(p) => (
          <input
            {...p}
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="block w-full text-body-sm text-muted-foreground file:mr-3 file:h-10 file:cursor-pointer file:rounded-sm file:border-0 file:bg-surface-sunken file:px-4 file:font-semibold file:text-foreground"
          />
        )}
      </Field>

      {(state.error === 'generic' || state.error === 'notSignedIn') && (
        <p role="alert" className="text-body-sm font-medium text-danger">
          {t(`errors.${state.error}`)}
        </p>
      )}

      {state.success && (
        <p
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-sm bg-success/10 px-3 py-2.5 text-body-sm font-medium text-foreground"
        >
          <CheckCircle2 className="size-4 text-success" aria-hidden />
          {t('saved')}
          <Link href="/account/sightings" className="font-semibold text-primary underline-offset-4 hover:underline">
            {t('viewDiary')}
          </Link>
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:self-start">
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? t('saving') : t('submit')}
      </Button>
    </form>
  );
}
