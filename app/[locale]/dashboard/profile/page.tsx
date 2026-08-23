import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { getMyBusiness } from '@/lib/queries/dashboard';
import { getCategories, getDestinations } from '@/lib/queries/taxonomy';
import { BusinessProfileForm } from '@/components/dashboard/business-profile-form';

export default async function DashboardProfilePage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const business = await getMyBusiness(locale);
  // The layout renders onboarding when there is no business, so reaching this
  // route without one means a stale link rather than a normal state.
  if (!business) notFound();

  const [t, categories, destinations] = await Promise.all([
    getTranslations('dashboard'),
    getCategories(locale),
    getDestinations(locale),
  ]);

  return (
    <div>
      <h2 className="sr-only">{t('profile')}</h2>
      <BusinessProfileForm
        business={{
          id: business.id,
          name: business.name,
          legal_name: business.legal_name,
          email: business.email,
          phone: business.phone,
          whatsapp: business.whatsapp,
          website: business.website,
          address: business.address,
          city: business.city,
          founded_year: business.founded_year,
          team_size: business.team_size,
          license_number: business.license_number,
          tagline: business.tagline,
          shortDescription: business.shortDescription,
          description: business.description,
        }}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        destinations={destinations.map((d) => ({ id: d.id, name: d.name }))}
        selectedCategoryIds={business.categoryIds}
        selectedDestinationIds={business.destinationIds}
      />
    </div>
  );
}
