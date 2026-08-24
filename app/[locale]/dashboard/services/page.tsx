import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { getMyBusiness } from '@/lib/queries/dashboard';
import { ServicesManager, type ServiceRow } from '@/components/dashboard/services-manager';

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  return { title: t('services'), robots: { index: false, follow: false } };
}

export default async function ServicesPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const business = await getMyBusiness(locale);
  if (!business) notFound();

  const supabase = await createClient();

  const [{ data: rows }, { data: plan }] = await Promise.all([
    supabase
      .from('business_services')
      .select(
        'id, price_from, currency, is_active, sort_order, business_service_translations (locale, name, description)',
      )
      .eq('business_id', business.id)
      .order('sort_order'),
    supabase.from('subscription_plans').select('max_services').eq('key', 'free').single(),
  ]);

  const t = await getTranslations('dashboard.servicesPage');

  const services: ServiceRow[] = (rows ?? []).map((r) => {
    const tr =
      r.business_service_translations.find((x) => x.locale === locale) ??
      r.business_service_translations.find((x) => x.locale === 'en');
    return {
      id: r.id,
      price_from: r.price_from,
      currency: r.currency,
      is_active: r.is_active,
      name: tr?.name ?? null,
      description: tr?.description ?? null,
    };
  });

  // The free allowance is the floor. The action resolves the caller's actual
  // plan and is the thing that enforces it; this only decides whether to show
  // the form or the upgrade prompt.
  const limit = plan?.max_services ?? null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <ServicesManager
        services={services}
        locale={locale}
        limit={limit}
        atLimit={limit !== null && services.length >= limit}
      />
    </div>
  );
}
