import { getTranslations } from 'next-intl/server';

import { getDestinations } from '@/lib/queries/taxonomy';
import { getFeaturedBusinesses } from '@/lib/queries/businesses';
import { getGuides } from '@/lib/queries/guides';
import { Section } from '@/components/layout/section';
import { DestinationCard } from '@/components/cards/destination-card';
import { BusinessCard } from '@/components/cards/business-card';
import { GuideCard } from '@/components/cards/guide-card';
import type { Locale } from '@/i18n/routing';

export async function PopularDestinations({ locale }: { locale: Locale }) {
  const [destinations, t] = await Promise.all([
    getDestinations(locale, { limit: 6 }),
    getTranslations('home.destinations'),
  ]);

  if (destinations.length === 0) return null;

  // The first two run larger: an even grid of six reads as a list, while an
  // asymmetric one reads as an editorial layout and gives the headline
  // destinations the weight they deserve.
  const [lead, second, ...rest] = destinations;

  return (
    <Section
      title={t('title')}
      subtitle={t('subtitle')}
      viewAllHref="/destinations"
      viewAllLabel={t('viewAll')}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DestinationCard destination={lead} size="large" className="lg:col-span-2 lg:row-span-2" />
        {second && <DestinationCard destination={second} className="lg:col-span-2" />}
        {rest.slice(0, 2).map((d) => (
          <DestinationCard key={d.id} destination={d} />
        ))}
        {rest.slice(2).map((d) => (
          <DestinationCard key={d.id} destination={d} className="lg:col-span-2" />
        ))}
      </div>
    </Section>
  );
}

export async function FeaturedOperators({ locale }: { locale: Locale }) {
  const [businesses, t] = await Promise.all([
    getFeaturedBusinesses(locale, 6),
    getTranslations('home.featured'),
  ]);

  if (businesses.length === 0) return null;

  return (
    <Section
      title={t('title')}
      subtitle={t('subtitle')}
      viewAllHref="/directory"
      viewAllLabel={t('viewAll')}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {businesses.map((b) => (
          <BusinessCard key={b.id} business={b} />
        ))}
      </div>
    </Section>
  );
}

export async function LatestGuides({ locale }: { locale: Locale }) {
  const [guides, t] = await Promise.all([
    getGuides(locale, { limit: 3 }),
    getTranslations('home.guides'),
  ]);

  if (guides.length === 0) return null;

  return (
    <Section
      title={t('title')}
      subtitle={t('subtitle')}
      viewAllHref="/guides"
      viewAllLabel={t('viewAll')}
      muted
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((g) => (
          <GuideCard key={g.id} guide={g} />
        ))}
      </div>
    </Section>
  );
}
