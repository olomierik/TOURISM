import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { createGuide } from '@/lib/admin/crud';
import {
  AdminForm,
  CheckField,
  Field,
  SelectField,
  TextField,
} from '@/components/admin/admin-form';

export default async function NewGuidePage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.guideForm');
  const supabase = await createClient();

  const [{ data: destinations }, { data: categories }] = await Promise.all([
    supabase
      .from('destinations')
      .select('id, destination_translations (locale, name)')
      .is('deleted_at', null)
      .order('sort_order'),
    supabase
      .from('categories')
      .select('id, category_translations (locale, name)')
      .order('sort_order'),
  ]);

  const pick = <T extends { locale: string; name: string }>(rows: T[]) =>
    rows.find((r) => r.locale === locale)?.name ?? rows.find((r) => r.locale === 'en')?.name ?? '';

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('createTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('createSubtitle')}</p>
      </div>

      <AdminForm action={createGuide} submitLabel={t('createSubmit')}>
        <Field name="title" label={t('titleField')} required />
        <Field name="slug" label={t('slug')} hint={t('slugHint')} />
        <TextField name="excerpt" label={t('excerpt')} hint={t('excerptHint')} rows={3} />
        <TextField name="body" label={t('body')} hint={t('bodyHint')} rows={18} />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="destinationId"
            label={t('destination')}
            options={(destinations ?? []).map((d) => ({
              value: d.id,
              label: pick(d.destination_translations),
            }))}
          />
          <SelectField
            name="categoryId"
            label={t('category')}
            options={(categories ?? []).map((c) => ({
              value: c.id,
              label: pick(c.category_translations),
            }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="readingMinutes" label={t('readingMinutes')} type="number" />
          <Field name="sortOrder" label={t('sortOrder')} type="number" defaultValue={0} />
        </div>

        <TextField name="seoDescription" label={t('seoDescription')} hint={t('seoDescriptionHint')} rows={2} />

        <div className="space-y-3 rounded-xl border p-4">
          <CheckField name="isFeatured" label={t('isFeatured')} />
          <CheckField name="allowAds" label={t('allowAds')} hint={t('allowAdsHint')} defaultChecked />
        </div>
      </AdminForm>
    </div>
  );
}
