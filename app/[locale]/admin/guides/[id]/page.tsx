import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { locales, type Locale, type LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { updateGuide } from '@/lib/admin/crud';
import {
  AdminForm,
  CheckField,
  Field,
  LocaleTabs,
  SelectField,
  TextField,
} from '@/components/admin/admin-form';
import { GuideDangerZone } from '@/components/admin/danger-zone';
import { GuideActions } from '@/components/admin/moderation-actions';
import { Badge } from '@/components/ui/badge';

export default async function EditGuidePage({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams & { id: string }>;
  searchParams: Promise<{ tr?: string }>;
}) {
  const { locale, id } = await params;
  const { tr } = await searchParams;
  setRequestLocale(locale);

  const editing: Locale = locales.includes(tr as Locale) ? (tr as Locale) : 'en';

  const t = await getTranslations('admin.guideForm');
  const supabase = await createClient();

  const [{ data: guide }, { data: destinations }, { data: categories }] = await Promise.all([
    supabase
      .from('guides')
      .select(
        `id, status, primary_destination_id, primary_category_id, reading_minutes,
         is_featured, allow_ads, sort_order, deleted_at,
         guide_translations (locale, title, slug, excerpt, body, seo_title, seo_description)`,
      )
      .eq('id', id)
      .maybeSingle(),
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

  if (!guide) notFound();

  const pick = <T extends { locale: string; name: string }>(rows: T[]) =>
    rows.find((r) => r.locale === locale)?.name ?? rows.find((r) => r.locale === 'en')?.name ?? '';

  const current = guide.guide_translations.find((x) => x.locale === editing);
  const translated = guide.guide_translations.map((x) => x.locale);
  const englishTitle = guide.guide_translations.find((x) => x.locale === 'en')?.title ?? '';

  return (
    <div className="max-w-3xl space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant={guide.status === 'published' ? 'verified' : 'secondary'}>
            {t(`status.${guide.status}`)}
          </Badge>
          <h1 className="mt-2 text-2xl font-semibold">{englishTitle}</h1>
        </div>
        {/* Publishing is separate from saving. An editor mid-revision on a live
            guide must be able to save without the save itself changing what the
            public sees. */}
        <GuideActions guideId={guide.id} status={guide.status} />
      </div>

      <section className="space-y-5">
        <LocaleTabs current={editing} translated={translated} hrefFor={(l) => `?tr=${l}`} />

        <AdminForm action={updateGuide}>
          <input type="hidden" name="id" value={guide.id} />
          <input type="hidden" name="locale" value={editing} />

          <Field name="title" label={t('titleField')} required defaultValue={current?.title} />
          <Field name="slug" label={t('slug')} hint={t('slugHint')} defaultValue={current?.slug} />
          <TextField name="excerpt" label={t('excerpt')} hint={t('excerptHint')} rows={3} defaultValue={current?.excerpt} />
          <TextField name="body" label={t('body')} hint={t('bodyHint')} rows={20} defaultValue={current?.body} />
          <TextField
            name="seoDescription"
            label={t('seoDescription')}
            hint={t('seoDescriptionHint')}
            rows={2}
            defaultValue={current?.seo_description}
          />

          <div className="space-y-5 rounded-xl border p-5">
            <p className="text-sm font-medium">{t('sharedFields')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                name="destinationId"
                label={t('destination')}
                defaultValue={guide.primary_destination_id}
                options={(destinations ?? []).map((d) => ({
                  value: d.id,
                  label: pick(d.destination_translations),
                }))}
              />
              <SelectField
                name="categoryId"
                label={t('category')}
                defaultValue={guide.primary_category_id}
                options={(categories ?? []).map((c) => ({
                  value: c.id,
                  label: pick(c.category_translations),
                }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="readingMinutes" label={t('readingMinutes')} type="number" defaultValue={guide.reading_minutes} />
              <Field name="sortOrder" label={t('sortOrder')} type="number" defaultValue={guide.sort_order} />
            </div>
            <CheckField name="isFeatured" label={t('isFeatured')} defaultChecked={guide.is_featured} />
            <CheckField name="allowAds" label={t('allowAds')} hint={t('allowAdsHint')} defaultChecked={guide.allow_ads} />
          </div>
        </AdminForm>
      </section>

      <GuideDangerZone id={guide.id} name={englishTitle} retired={Boolean(guide.deleted_at)} />
    </div>
  );
}
