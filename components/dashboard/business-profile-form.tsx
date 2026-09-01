'use client';

import { useActionState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, Check } from 'lucide-react';

import { TaxonomyPicker, type TaxonomyOption } from '@/components/dashboard/taxonomy-picker';
import { CountrySelect } from '@/components/admin/country-region-picker';
import { updateBusiness, type DashboardState } from '@/lib/dashboard/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PinLocation } from '@/components/dashboard/pin-location';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { localeMeta, type Locale } from '@/i18n/routing';

const initial: DashboardState = {};

type BusinessFields = {
  id: string;
  name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: 'exact' | 'city' | null;
  country_code: string | null;
  founded_year: number | null;
  team_size: number | null;
  license_number: string | null;
  associations: string | null;
  day_rate_low: number | null;
  day_rate_high: number | null;
  tagline: string | null;
  shortDescription: string | null;
  description: string | null;
};

export function BusinessProfileForm({
  business,
  categories,
  destinations,
  selectedCategoryIds,
  selectedDestinationIds,
  countries,
}: {
  business: BusinessFields;
  categories: TaxonomyOption[];
  destinations: TaxonomyOption[];
  selectedCategoryIds: string[];
  selectedDestinationIds: string[];
  countries: Array<{ code: string; name: string }>;
}) {
  const t = useTranslations('dashboard');
  const tErr = useTranslations('dashboard.errors');
  const locale = useLocale() as Locale;
  const [state, formAction, pending] = useActionState(updateBusiness, initial);

  return (
    <form action={formAction} className="space-y-10">
      <input type="hidden" name="businessId" value={business.id} />

      {state.success && (
        <Alert variant="success">
          <Check className="size-4" aria-hidden />
          <AlertDescription>{t('profileSaved')}</AlertDescription>
        </Alert>
      )}
      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{tErr(state.error)}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-5">
        <h2 className="font-display text-lg font-semibold">{t('sectionBasics')}</h2>

        <div className="space-y-2">
          <Label htmlFor="name">{t('name')}</Label>
          <Input id="name" name="name" defaultValue={business.name} required />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="legalName">{t('legalName')}</Label>
            <Input id="legalName" name="legalName" defaultValue={business.legal_name ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">{t('city')}</Label>
            <Input id="city" name="city" defaultValue={business.city ?? ''} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">{t('address')}</Label>
          <Input id="address" name="address" defaultValue={business.address ?? ''} />
        </div>

        {/* Under the address, because that is the question it answers more
            precisely. A city name puts a listing at a centroid up to twenty
            kilometres from the door; only the operator can fix that. */}
        <PinLocation
          latitude={business.latitude}
          longitude={business.longitude}
          precision={business.locationPrecision}
        />

        <CountrySelect
          countries={countries}
          label={t('country')}
          hint={t('countryHint')}
          defaultCountry={business.country_code}
        />
      </section>

      {/* Placed directly after the basics rather than at the bottom: this is what
          decides whether the listing is findable at all, so it should be seen
          before an owner decides the form is done. */}
      <section className="space-y-6">
        <h2 className="font-display text-lg font-semibold">{t('sectionReach')}</h2>

        <TaxonomyPicker
          name="categoryIds"
          label={t('categoriesLabel')}
          hint={t('categoriesHint')}
          options={categories}
          selected={selectedCategoryIds}
        />

        <TaxonomyPicker
          name="destinationIds"
          label={t('destinationsLabel')}
          hint={t('destinationsHint')}
          options={destinations}
          selected={selectedDestinationIds}
          primaryNote={t('destinationsPrimary')}
        />
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-lg font-semibold">{t('sectionContact')}</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" name="email" type="email" defaultValue={business.email ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t('phone')}</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={business.phone ?? ''} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">{t('whatsapp')}</Label>
            <Input id="whatsapp" name="whatsapp" type="tel" defaultValue={business.whatsapp ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">{t('website')}</Label>
            <Input
              id="website"
              name="website"
              type="url"
              placeholder="https://"
              defaultValue={business.website ?? ''}
            />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-lg font-semibold">{t('sectionAbout')}</h2>

        {/* Descriptions are per-locale. Making that explicit prevents an owner
            wondering why their German page still shows the old text. */}
        <Alert variant="info">
          <AlertDescription>
            {t('translationNotice', { locale: localeMeta[locale].native })}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="tagline">{t('tagline')}</Label>
          <Input
            id="tagline"
            name="tagline"
            maxLength={120}
            defaultValue={business.tagline ?? ''}
            aria-describedby="tagline-hint"
          />
          <p id="tagline-hint" className="text-xs text-muted-foreground">
            {t('taglineHint')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="shortDescription">{t('shortDescription')}</Label>
          <Textarea
            id="shortDescription"
            name="shortDescription"
            rows={2}
            maxLength={300}
            defaultValue={business.shortDescription ?? ''}
            aria-describedby="short-hint"
          />
          <p id="short-hint" className="text-xs text-muted-foreground">
            {t('shortDescriptionHint')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('description')}</Label>
          <Textarea
            id="description"
            name="description"
            rows={8}
            defaultValue={business.description ?? ''}
          />
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-lg font-semibold">{t('sectionCredentials')}</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="foundedYear">{t('foundedYear')}</Label>
            <Input
              id="foundedYear"
              name="foundedYear"
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              defaultValue={business.founded_year ?? ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teamSize">{t('teamSize')}</Label>
            <Input
              id="teamSize"
              name="teamSize"
              type="number"
              min={1}
              defaultValue={business.team_size ?? ''}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="associations">{t('associations')}</Label>
          <Input
            id="associations"
            name="associations"
            defaultValue={business.associations ?? ''}
            placeholder={t('associationsPlaceholder')}
          />
        </div>

        {/*
          The number a traveller looks for first, and the reason a directory can
          be compared at all. Optional: an operator who would rather quote per
          enquiry leaves it blank and nothing is shown, which is better than a
          made-up figure.
        */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dayRateLow">{t('dayRateLow')}</Label>
            <Input
              id="dayRateLow"
              name="dayRateLow"
              type="number"
              min={20}
              max={20000}
              defaultValue={business.day_rate_low ?? ''}
              aria-describedby="day-rate-hint"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dayRateHigh">{t('dayRateHigh')}</Label>
            <Input
              id="dayRateHigh"
              name="dayRateHigh"
              type="number"
              min={20}
              max={20000}
              defaultValue={business.day_rate_high ?? ''}
              aria-describedby="day-rate-hint"
            />
          </div>
        </div>
        <p id="day-rate-hint" className="text-xs text-muted-foreground">
          {t('dayRateHint')}
        </p>

        <div className="space-y-2">
          <Label htmlFor="licenseNumber">{t('licenseNumber')}</Label>
          <Input
            id="licenseNumber"
            name="licenseNumber"
            defaultValue={business.license_number ?? ''}
            aria-describedby="license-hint"
          />
          <p id="license-hint" className="text-xs text-muted-foreground">
            {t('licenseHint')}
          </p>
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" size="lg" disabled={pending} className="shadow-lg">
          {pending ? t('saving') : t('save')}
        </Button>
      </div>
    </form>
  );
}
