import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowUpRight, ImageIcon, Store } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyBusiness } from '@/lib/queries/dashboard';
import { galleryAllowance } from '@/lib/media/actions';
import { ImageUploader } from '@/components/media/image-uploader';
import { GalleryManager } from '@/components/media/gallery-manager';
import { Button } from '@/components/ui/button';

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  return { title: t('gallery'), robots: { index: false, follow: false } };
}

export default async function GalleryPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.galleryPage');
  const business = await getMyBusiness(locale);

  if (!business) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <Store className="size-7 text-primary" aria-hidden />
        </div>
        <h2 className="mt-6 text-2xl font-semibold">{t('noBusinessTitle')}</h2>
        <p className="mt-3 text-muted-foreground">{t('noBusinessBody')}</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">{t('noBusinessCta')}</Link>
        </Button>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: images } = await supabase
    .from('media')
    .select('id, public_url, caption, alt_text')
    .eq('business_id', business.id)
    .eq('kind', 'gallery')
    .order('sort_order');

  const { used, limit } = await galleryAllowance(business.id);
  const remaining = limit === null ? null : Math.max(0, limit - used);
  const atLimit = remaining !== null && remaining <= 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('subtitle')}</p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3">
        <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">
          {limit === null ? t('countUnlimited', { used }) : t('count', { used, limit })}
        </p>
        {!atLimit && limit !== null && (
          <span className="text-sm text-muted-foreground">
            {t('remaining', { remaining: remaining ?? 0 })}
          </span>
        )}
      </div>

      <ImageUploader
        owner={{ businessId: business.id }}
        kind="gallery"
        remaining={remaining}
        disabledReason={
          // The upgrade prompt replaces the upload control rather than sitting
          // beside it. A disabled drop zone next to an upsell reads as a fault;
          // a clear statement of the limit and one route past it reads as a
          // choice, which is what it is.
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
            <h2 className="text-lg font-semibold">{t('limitTitle', { limit: limit ?? 0 })}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {t('limitBody', { limit: limit ?? 0 })}
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/subscription">
                {t('limitCta')}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">{t('limitHint')}</p>
          </div>
        }
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('manageTitle')}</h2>
        <GalleryManager images={images ?? []} />
      </section>
    </div>
  );
}
