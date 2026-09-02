import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { getMyBusiness } from '@/lib/queries/dashboard';
import { getCategories, getDestinations } from '@/lib/queries/taxonomy';
import { getAllCountries } from '@/lib/queries/geo';
import { CoverImageField } from '@/components/media/cover-image-field';
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

  const [t, tMedia, categories, destinations, countries] = await Promise.all([
    getTranslations('dashboard'),
    getTranslations('media'),
    getCategories(locale),
    getDestinations(locale),
    getAllCountries(),
  ]);

  return (
    <div className="space-y-8">
      <h2 className="sr-only">{t('profile')}</h2>

      {/* The cover photograph, which had nowhere to be set.
          The bucket, the upload action and the column all existed and nothing
          joined them for a business — CoverImageField was wired for
          destinations and guides, both admin-only. So an operator could not put
          a picture on their own listing at all, and 1,421 listings show a
          placeholder partly for that reason. Above the form because it is the
          first thing a traveller sees on the listing. */}
      <section className="rounded-2xl border bg-card p-6">
        <h3 className="font-display text-lg font-semibold">{tMedia('coverTitle')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{tMedia('coverHint')}</p>
        <div className="mt-4">
          <CoverImageField
            target={{ businessId: business.id }}
            current={business.cover_image_url}
          />
        </div>
      </section>

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
          latitude: business.latitude === null ? null : Number(business.latitude),
          longitude: business.longitude === null ? null : Number(business.longitude),
          locationPrecision: business.location_precision,
          founded_year: business.founded_year,
          team_size: business.team_size,
          license_number: business.license_number,
          associations: business.associations,
          day_rate_low: business.day_rate_low,
          day_rate_high: business.day_rate_high,
          country_code: business.country_code,
          tagline: business.tagline,
          shortDescription: business.shortDescription,
          description: business.description,
        }}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        destinations={destinations.map((d) => ({ id: d.id, name: d.name }))}
        selectedCategoryIds={business.categoryIds}
        selectedDestinationIds={business.destinationIds}
        countries={countries}
      />
    </div>
  );
}
