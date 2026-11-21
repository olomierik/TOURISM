'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, Loader2, Save } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import type { PackageState } from '@/lib/dashboard/package-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TaxonomyPicker, type TaxonomyOption } from '@/components/dashboard/taxonomy-picker';
import { Select } from '@/components/ui/select';

const initial: PackageState = {};

export type PackageFields = {
  id?: string;
  title?: string | null;
  summary?: string | null;
  description?: string | null;
  itinerary?: string | null;
  duration_days?: number | null;
  duration_nights?: number | null;
  price_from?: number | string | null;
  currency?: string | null;
  price_unit?: string | null;
  max_group_size?: number | null;
  min_travelers?: number | null;
  comfort_level?: string | null;
  tour_style?: string | null;
  start_city?: string | null;
  is_customizable?: boolean | null;
  /** SEO brief T15 (migration 093). */
  park_fees_included?: boolean | null;
  vehicle?: string | null;
  rates?: Array<{ season: string; groupMin: number; groupMax: number | null; price: number }>;
  departures?: string[];
  /** Destinations this trip visits, in the order they were saved. */
  destinationIds?: string[];
};

/**
 * Create/edit form for a package.
 *
 * One component for both because the fields are identical and the only
 * difference is which action it posts to — two near-copies would drift the
 * moment a field is added to one of them.
 */
export function PackageForm({
  action,
  pkg,
  locale,
  destinations,
  submitLabel,
}: {
  action: (prev: PackageState, formData: FormData) => Promise<PackageState>;
  pkg?: PackageFields;
  locale: string;
  destinations: TaxonomyOption[];
  submitLabel?: string;
}) {
  const t = useTranslations('dashboard.packageForm');
  const tTours = useTranslations('tours');
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-8">
      {pkg?.id && <input type="hidden" name="id" value={pkg.id} />}
      <input type="hidden" name="locale" value={locale} />

      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>
            {state.error === 'limitReached' && state.limit != null ? (
              <>
                {t('errors.limitReachedWithCount', { count: state.limit })}{' '}
                <Link href="/dashboard/subscription" className="font-medium underline">
                  {t('seePlans')}
                </Link>
              </>
            ) : (
              t(`errors.${state.error}`)
            )}
          </AlertDescription>
        </Alert>
      )}

      {state.success && (
        <Alert>
          <Check className="size-4" aria-hidden />
          <AlertDescription>{t('saved')}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">
            {t('title')}
            <span className="ml-1 text-destructive">*</span>
          </Label>
          <Input id="title" name="title" required defaultValue={pkg?.title ?? ''} placeholder={t('titlePlaceholder')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="summary">{t('summary')}</Label>
          <Textarea id="summary" name="summary" rows={2} defaultValue={pkg?.summary ?? ''} />
          <p className="text-xs text-muted-foreground">{t('summaryHint')}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('description')}</Label>
          <Textarea id="description" name="description" rows={6} defaultValue={pkg?.description ?? ''} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="itinerary">{t('itinerary')}</Label>
          <Textarea id="itinerary" name="itinerary" rows={8} defaultValue={pkg?.itinerary ?? ''} />
        </div>

        {/*
          Without this the trip is attached to nothing. package_destinations is
          read by three queries and was written by none, so every tour was
          invisible on destination pages, its TouristTrip itinerary was an empty
          array, and the "tours here" section on 46 destination pages could never
          render. The save action accepted destinationIds the whole time; the
          form simply never offered them.
        */}
        <div className="space-y-2">
          <TaxonomyPicker
            name="destinationIds"
            label={t('destinationsLabel')}
            hint={t('destinationsHint')}
            options={destinations}
            selected={pkg?.destinationIds ?? []}
          />
          <p className="text-xs text-muted-foreground">{t('itineraryHint')}</p>
        </div>
      </section>

      <section className="space-y-5 rounded-xl border p-5">
        <h3 className="text-sm font-medium">{t('sectionPricing')}</h3>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="priceFrom">{t('priceFrom')}</Label>
            <Input id="priceFrom" name="priceFrom" type="number" min="0" step="1" defaultValue={pkg?.price_from ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">{t('currency')}</Label>
            <Select
              id="currency"
              name="currency"
              defaultValue={pkg?.currency ?? 'USD'}
              className="border-input"
            >
              {['USD', 'EUR', 'GBP', 'TZS'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceUnit">{t('priceUnit')}</Label>
            <Select
              id="priceUnit"
              name="priceUnit"
              defaultValue={pkg?.price_unit ?? 'per_person'}
              className="border-input"
            >
              {/* Listed explicitly rather than mapped over strings: the
                  translation keys are typed, and a template literal widens to
                  `units.${string}` which no longer matches them. */}
              {(['per_person', 'per_group', 'per_day', 'per_vehicle'] as const).map((u) => (
                <option key={u} value={u}>
                  {t(`units.${u}`)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="durationDays">{t('durationDays')}</Label>
            <Input id="durationDays" name="durationDays" type="number" min="1" defaultValue={pkg?.duration_days ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="durationNights">{t('durationNights')}</Label>
            <Input id="durationNights" name="durationNights" type="number" min="0" defaultValue={pkg?.duration_nights ?? ''} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="minTravelers">{t('minTravelers')}</Label>
            <Input id="minTravelers" name="minTravelers" type="number" min="1" defaultValue={pkg?.min_travelers ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxGroupSize">{t('maxGroupSize')}</Label>
            <Input id="maxGroupSize" name="maxGroupSize" type="number" min="1" defaultValue={pkg?.max_group_size ?? ''} />
          </div>
        </div>
      </section>

      {/* The answers the tour search filters on (migration 091). Its own
          section with its own reason, because "comfort level" beside "max
          group size" reads as one more optional detail, and it is not: a tour
          that leaves these blank drops out of every filtered search. */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{tTours('formTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tTours('formHint')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="comfortLevel">{tTours('formComfort')}</Label>
            <Select id="comfortLevel" name="comfortLevel" defaultValue={pkg?.comfort_level ?? ''}>
              <option value="">{tTours('formNotSet')}</option>
              <option value="budget">{tTours('comfort_budget')}</option>
              <option value="midrange">{tTours('comfort_midrange')}</option>
              <option value="luxury">{tTours('comfort_luxury')}</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tourStyle">{tTours('formStyle')}</Label>
            <Select id="tourStyle" name="tourStyle" defaultValue={pkg?.tour_style ?? ''}>
              <option value="">{tTours('formNotSet')}</option>
              <option value="private">{tTours('style_private')}</option>
              <option value="shared">{tTours('style_shared')}</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startCity">{tTours('formStartCity')}</Label>
            <Input
              id="startCity"
              name="startCity"
              maxLength={80}
              defaultValue={pkg?.start_city ?? ''}
              placeholder={tTours('formStartCityPlaceholder')}
            />
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="isCustomizable"
            defaultChecked={Boolean(pkg?.is_customizable)}
            className="size-4 accent-[var(--primary)]"
          />
          {tTours('formCustomizable')}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="parkFeesIncluded">{tTours('formParkFees')}</Label>
            <Select
              id="parkFeesIncluded"
              name="parkFeesIncluded"
              defaultValue={pkg?.park_fees_included == null ? '' : pkg.park_fees_included ? 'yes' : 'no'}
            >
              <option value="">{tTours('formParkFeesUnset')}</option>
              <option value="yes">{tTours('formParkFeesYes')}</option>
              <option value="no">{tTours('formParkFeesNo')}</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vehicle">{tTours('formVehicle')}</Label>
            <Input id="vehicle" name="vehicle" maxLength={120} defaultValue={pkg?.vehicle ?? ''} placeholder={tTours('formVehicleHint')} />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">{tTours('formRatesTitle')}</h2>
        <p className="text-sm text-muted-foreground">{tTours('formRatesHint')}</p>
        {Array.from({ length: 4 }, (_, i) => pkg?.rates?.[i]).map((r, i) => (
          <div key={i} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Select name="rateSeason" defaultValue={r?.season ?? 'all'} aria-label={tTours('formSeason')}>
              <option value="all">{tTours('season_all')}</option>
              <option value="high">{tTours('season_high')}</option>
              <option value="low">{tTours('season_low')}</option>
            </Select>
            <Input name="rateGroupMin" type="number" min="1" defaultValue={r?.groupMin ?? ''} placeholder={tTours('formGroupMin')} aria-label={tTours('formGroupMin')} />
            <Input name="rateGroupMax" type="number" min="1" defaultValue={r?.groupMax ?? ''} placeholder={tTours('formGroupMax')} aria-label={tTours('formGroupMax')} />
            <Input name="ratePrice" type="number" min="1" step="1" defaultValue={r?.price ?? ''} placeholder={tTours('formRatePrice')} aria-label={tTours('formRatePrice')} />
          </div>
        ))}
        <div className="space-y-1.5 pt-2">
          <Label htmlFor="departures">{tTours('formDepartures')}</Label>
          <Textarea id="departures" name="departures" rows={3} defaultValue={(pkg?.departures ?? []).join('\n')} />
          <p className="text-xs text-muted-foreground">{tTours('formDeparturesHint')}</p>
        </div>
      </section>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t('saving')}
          </>
        ) : (
          <>
            <Save className="size-4" aria-hidden />
            {submitLabel ?? t('save')}
          </>
        )}
      </Button>
    </form>
  );
}
