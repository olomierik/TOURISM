import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { getMyBusiness } from '@/lib/queries/dashboard';
import { createPackage } from '@/lib/dashboard/package-actions';
import { PackageForm } from '@/components/dashboard/package-form';
import { getDestinations } from '@/lib/queries/taxonomy';

export default async function NewPackagePage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const business = await getMyBusiness(locale);
  if (!business) notFound();

  const [t, destinations] = await Promise.all([
    getTranslations('dashboard.packageForm'),
    getDestinations(locale),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t('createTitle')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('createSubtitle')}</p>
      </div>
      <PackageForm
        action={createPackage}
        locale={locale}
        destinations={destinations}
        submitLabel={t('createSubmit')}
      />
    </div>
  );
}
