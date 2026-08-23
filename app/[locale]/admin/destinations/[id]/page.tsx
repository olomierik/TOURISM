import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { locales, type Locale, type LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { updateDestination } from '@/lib/admin/crud';
import { getCuratedCountries, getRegions } from '@/lib/queries/geo';
import { CountryRegionPicker } from '@/components/admin/country-region-picker';
import {
  AdminForm,
  CheckField,
  Field,
  LocaleTabs,
  TextField,
} from '@/components/admin/admin-form';
import { ImageUploader } from '@/components/media/image-uploader';
import { GalleryManager } from '@/components/media/gallery-manager';
import { DestinationDangerZone } from '@/components/admin/danger-zone';

export default async function EditDestinationPage({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams & { id: string }>;
  searchParams: Promise<{ tr?: string }>;
}) {
  const { locale, id } = await params;
  const { tr } = await searchParams;
  setRequestLocale(locale);

  // Which translation is being edited, independent of the admin's own UI
  // language — an English-speaking admin routinely edits the German copy.
  const editing: Locale = locales.includes(tr as Locale) ? (tr as Locale) : 'en';

  const [t, countries, regions] = await Promise.all([
    getTranslations('admin.destinationsPage'),
    getCuratedCountries(),
    getRegions(),
  ]);
  const supabase = await createClient();

  const { data: dest } = await supabase
    .from('destinations')
    .select(
      `id, key, latitude, longitude, is_active, is_featured, sort_order, deleted_at,
       country_code, region_id,
       destination_translations (locale, name, slug, summary, description, travel_tips, best_time)`,
    )
    .eq('id', id)
    .maybeSingle();

  if (!dest) notFound();

  const { data: images } = await supabase
    .from('media')
    .select('id, public_url, caption, alt_text')
    .eq('destination_id', id)
    .order('sort_order');

  const current = dest.destination_translations.find((x) => x.locale === editing);
  const translated = dest.destination_translations.map((x) => x.locale);
  const englishName =
    dest.destination_translations.find((x) => x.locale === 'en')?.name ?? dest.key;

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">
          {englishName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('editSubtitle')}</p>
      </div>

      <section className="space-y-5">
        <LocaleTabs current={editing} translated={translated} />

        <AdminForm action={updateDestination}>
          <input type="hidden" name="id" value={dest.id} />
          <input type="hidden" name="locale" value={editing} />

          <Field name="name" label={t('name')} required defaultValue={current?.name} />
          <Field name="slug" label={t('slug')} hint={t('slugHint')} defaultValue={current?.slug} />

          <TextField name="summary" label={t('summary')} rows={2} defaultValue={current?.summary} />
          <TextField name="description" label={t('description')} rows={8} defaultValue={current?.description} />
          <TextField name="bestTime" label={t('bestTime')} rows={3} defaultValue={current?.best_time} />
          <TextField name="travelTips" label={t('travelTips')} rows={4} defaultValue={current?.travel_tips} />

          {/* Only the translation fields above change per locale. These belong to
              the destination itself, so they are shown once and edited from
              whichever locale tab happens to be open. */}
          <div className="space-y-5 rounded-xl border p-5">
            <p className="text-sm font-medium">{t('sharedFields')}</p>
            <CountryRegionPicker
              countries={countries}
              regions={regions}
              countryLabel={t('country')}
              regionLabel={t('region')}
              regionHint={t('regionHint')}
              defaultCountry={dest.country_code}
              defaultRegionId={dest.region_id}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="latitude" label={t('latitude')} type="number" defaultValue={dest.latitude} />
              <Field name="longitude" label={t('longitude')} type="number" defaultValue={dest.longitude} />
            </div>
            <Field name="sortOrder" label={t('sortOrder')} type="number" defaultValue={dest.sort_order} />
            <CheckField name="isActive" label={t('isActive')} defaultChecked={dest.is_active} />
            <CheckField name="isFeatured" label={t('isFeatured')} defaultChecked={dest.is_featured} />
          </div>
        </AdminForm>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{t('photos')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('photosHint')}</p>
        </div>
        <ImageUploader owner={{ destinationId: dest.id }} kind="gallery" />
        <GalleryManager images={images ?? []} />
      </section>

      <DestinationDangerZone
        id={dest.id}
        name={englishName}
        retired={Boolean(dest.deleted_at)}
      />
    </div>
  );
}
