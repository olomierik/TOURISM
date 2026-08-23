import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { createBusinessAsAdmin } from '@/lib/admin/crud';
import { AdminForm, Field, TextField } from '@/components/admin/admin-form';
import { CountrySelect } from '@/components/admin/country-region-picker';
import { getAllCountries } from '@/lib/queries/geo';

export default async function NewBusinessPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, countries] = await Promise.all([
    getTranslations('admin.businessForm'),
    getAllCountries(),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('createTitle')}</h1>
        {/* Most operators here will be added from a phone call rather than by
            signing up, so this path has to exist and has to say what it does
            about ownership. */}
        <p className="mt-2 text-sm text-muted-foreground">{t('createSubtitle')}</p>
      </div>

      <AdminForm action={createBusinessAsAdmin} submitLabel={t('createSubmit')}>
        <Field name="name" label={t('name')} required />
        <Field name="slug" label={t('slug')} hint={t('slugHint')} />
        <Field name="legalName" label={t('legalName')} />

        <TextField name="tagline" label={t('tagline')} rows={2} />
        <TextField name="shortDescription" label={t('shortDescription')} rows={3} />
        <TextField name="description" label={t('description')} rows={8} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="email" label={t('email')} type="email" />
          <Field name="phone" label={t('phone')} />
          <Field name="whatsapp" label={t('whatsapp')} />
          <Field name="website" label={t('website')} type="url" />
        </div>

        <Field name="address" label={t('address')} />
        <Field name="city" label={t('city')} />
        <CountrySelect countries={countries} label={t('country')} hint={t('countryHint')} />
        <Field name="licenseNumber" label={t('licenseNumber')} hint={t('licenseHint')} />
      </AdminForm>
    </div>
  );
}
