import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { getAdminBoosts } from '@/lib/queries/admin';
import { BoostPanel } from '@/components/admin/boost-panel';

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin.boost' });
  return { title: t('pageTitle') };
}

/**
 * Every boost — live, scheduled and ended — and the form to add one for any
 * business. Live first, so this page answers "who is on page one right now".
 */
export default async function AdminFeaturedPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, boosts] = await Promise.all([
    getTranslations('admin.boost'),
    getAdminBoosts(locale),
  ]);
  const live = boosts.filter((b) => b.state === 'live').length;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('pageTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('pageLead', { live })}</p>
      </div>
      <BoostPanel locale={locale} boosts={boosts} showBusiness />
    </div>
  );
}
