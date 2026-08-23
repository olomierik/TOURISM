import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { updatePackage } from '@/lib/dashboard/package-actions';
import { PackageForm } from '@/components/dashboard/package-form';
import { PackageStatusControls } from '@/components/dashboard/package-status-controls';
import { Badge } from '@/components/ui/badge';

export default async function EditPackagePage({
  params,
}: {
  params: Promise<LocaleParams & { id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  // RLS restricts this to a package the caller owns, so no ownership check is
  // repeated here — an unowned id simply returns nothing and 404s.
  const { data: pkg } = await supabase
    .from('packages')
    .select(
      `id, status, duration_days, duration_nights, price_from, currency, price_unit,
       max_group_size, min_travelers, deleted_at,
       package_translations (locale, title, summary, description, itinerary)`,
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!pkg) notFound();

  const t = await getTranslations('dashboard.packageForm');
  const tr =
    pkg.package_translations.find((x) => x.locale === locale) ??
    pkg.package_translations.find((x) => x.locale === 'en');

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant={pkg.status === 'published' ? 'verified' : 'secondary'}>
            {t(`status.${pkg.status}`)}
          </Badge>
          <h2 className="mt-2 text-xl font-semibold">{tr?.title ?? ''}</h2>
        </div>
        {/* Publishing is separate from saving, so an owner can revise a live
            package without the revision going out half-finished. */}
        <PackageStatusControls id={pkg.id} status={pkg.status} title={tr?.title ?? ''} />
      </div>

      <PackageForm
        action={updatePackage}
        locale={locale}
        pkg={{
          id: pkg.id,
          title: tr?.title,
          summary: tr?.summary,
          description: tr?.description,
          itinerary: tr?.itinerary,
          duration_days: pkg.duration_days,
          duration_nights: pkg.duration_nights,
          price_from: pkg.price_from,
          currency: pkg.currency,
          price_unit: pkg.price_unit,
          max_group_size: pkg.max_group_size,
          min_travelers: pkg.min_travelers,
        }}
      />
    </div>
  );
}
