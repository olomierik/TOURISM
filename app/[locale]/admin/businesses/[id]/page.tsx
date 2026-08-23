import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { locales, type Locale, type LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { updateBusinessAsAdmin } from '@/lib/admin/crud';
import {
  AdminForm,
  Field,
  LocaleTabs,
  TextField,
} from '@/components/admin/admin-form';
import { ImageUploader } from '@/components/media/image-uploader';
import { GalleryManager } from '@/components/media/gallery-manager';
import { BusinessDangerZone } from '@/components/admin/danger-zone';
import { BusinessActions } from '@/components/admin/business-actions';
import { Badge } from '@/components/ui/badge';

export default async function EditBusinessPage({
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

  const t = await getTranslations('admin.businessForm');
  const supabase = await createClient();

  const { data: biz } = await supabase
    .from('businesses')
    .select(
      `id, name, slug, legal_name, email, phone, whatsapp, website, address, city,
       license_number, status, is_verified, deleted_at, owner_id,
       business_translations (locale, tagline, short_description, description)`,
    )
    .eq('id', id)
    .maybeSingle();

  if (!biz) notFound();

  const { data: images } = await supabase
    .from('media')
    .select('id, public_url, caption, alt_text')
    .eq('business_id', id)
    .eq('kind', 'gallery')
    .order('sort_order');

  const current = biz.business_translations.find((x) => x.locale === editing);
  const translated = biz.business_translations.map((x) => x.locale);

  return (
    <div className="max-w-3xl space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={biz.status === 'approved' ? 'verified' : 'secondary'}>
              {t(`status.${biz.status}`)}
            </Badge>
            {biz.is_verified && <Badge variant="verified">{t('verified')}</Badge>}
            {!biz.owner_id && <Badge variant="secondary">{t('unclaimed')}</Badge>}
          </div>
          <h1 className="mt-2 text-2xl font-semibold">{biz.name}</h1>
        </div>
        <BusinessActions
          businessId={biz.id}
          status={biz.status}
          isVerified={biz.is_verified}
        />
      </div>

      <section className="space-y-5">
        <LocaleTabs current={editing} translated={translated} />

        <AdminForm action={updateBusinessAsAdmin}>
          <input type="hidden" name="id" value={biz.id} />
          <input type="hidden" name="locale" value={editing} />

          <TextField name="tagline" label={t('tagline')} rows={2} defaultValue={current?.tagline} />
          <TextField
            name="shortDescription"
            label={t('shortDescription')}
            rows={3}
            defaultValue={current?.short_description}
          />
          <TextField name="description" label={t('description')} rows={8} defaultValue={current?.description} />

          <div className="space-y-5 rounded-xl border p-5">
            <p className="text-sm font-medium">{t('sharedFields')}</p>
            <Field name="name" label={t('name')} required defaultValue={biz.name} />
            <Field name="slug" label={t('slug')} hint={t('slugHint')} defaultValue={biz.slug} />
            <Field name="legalName" label={t('legalName')} defaultValue={biz.legal_name} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="email" label={t('email')} type="email" defaultValue={biz.email} />
              <Field name="phone" label={t('phone')} defaultValue={biz.phone} />
              <Field name="whatsapp" label={t('whatsapp')} defaultValue={biz.whatsapp} />
              <Field name="website" label={t('website')} type="url" defaultValue={biz.website} />
            </div>
            <Field name="address" label={t('address')} defaultValue={biz.address} />
            <Field name="city" label={t('city')} defaultValue={biz.city} />
            <Field
              name="licenseNumber"
              label={t('licenseNumber')}
              hint={t('licenseHint')}
              defaultValue={biz.license_number}
            />
          </div>
        </AdminForm>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{t('photos')}</h2>
          {/* An admin uploading on a business's behalf is exempt from the plan
              quota — the trigger checks is_admin() — so no allowance is shown
              here. Curating a listing is not the thing being metered. */}
          <p className="mt-1 text-sm text-muted-foreground">{t('photosHint')}</p>
        </div>
        <ImageUploader owner={{ businessId: biz.id }} kind="gallery" />
        <GalleryManager images={images ?? []} />
      </section>

      <BusinessDangerZone id={biz.id} name={biz.name} retired={Boolean(biz.deleted_at)} />
    </div>
  );
}
