import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { createDestination } from '@/lib/admin/crud';
import { getCuratedCountries, getRegions } from '@/lib/queries/geo';
import { CountryRegionPicker } from '@/components/admin/country-region-picker';
import {
  AdminForm,
  CheckField,
  Field,
  TextField,
} from '@/components/admin/admin-form';

export default async function NewDestinationPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, countries, regions] = await Promise.all([
    getTranslations('admin.destinationsPage'),
    getCuratedCountries(),
    getRegions(),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('createTitle')}</h1>
        {/* Saying up front that this is English-only avoids the reasonable
            assumption that a destination created here is missing from the other
            three languages by accident. */}
        <p className="mt-2 text-sm text-muted-foreground">{t('createSubtitle')}</p>
      </div>

      <AdminForm action={createDestination} submitLabel={t('createSubmit')}>
        <CountryRegionPicker
          countries={countries}
          regions={regions}
          countryLabel={t('country')}
          regionLabel={t('region')}
          regionHint={t('regionHint')}
        />

        <Field name="name" label={t('name')} required placeholder={t('namePlaceholder')} />
        <Field name="slug" label={t('slug')} hint={t('slugHint')} />
        <Field name="key" label={t('key')} hint={t('keyHint')} />

        <TextField name="summary" label={t('summary')} hint={t('summaryHint')} rows={2} />
        <TextField name="description" label={t('description')} rows={8} />
        <TextField name="bestTime" label={t('bestTime')} rows={3} />
        <TextField name="travelTips" label={t('travelTips')} rows={4} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="latitude" label={t('latitude')} type="number" />
          <Field name="longitude" label={t('longitude')} type="number" />
        </div>

        <Field name="sortOrder" label={t('sortOrder')} type="number" defaultValue={0} hint={t('sortOrderHint')} />

        <div className="space-y-3 rounded-xl border p-4">
          <CheckField name="isActive" label={t('isActive')} hint={t('isActiveHint')} defaultChecked />
          <CheckField name="isFeatured" label={t('isFeatured')} hint={t('isFeaturedHint')} />
        </div>
      </AdminForm>
    </div>
  );
}
