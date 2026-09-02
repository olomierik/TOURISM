import { getTranslations } from 'next-intl/server';

import { getDestinations } from '@/lib/queries/taxonomy';
import { getFeaturedBusinesses } from '@/lib/queries/businesses';
import { getGuides } from '@/lib/queries/guides';
import { Section } from '@/components/layout/section';
import { Rail } from '@/components/ui/rail';
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

  // One lead tile beside a rail of the rest.
  //
  // Six destinations in an asymmetric grid came to 1,472px — the tallest thing
  // on the homepage, for six items. The editorial reasoning behind that grid
  // was sound and is kept: the lead destination still runs large, because six
  // identical tiles read as a list. What changes is that the other five sit
  // beside it in a row rather than under it, which costs one tile's height
  // instead of four.
  const [lead, ...rest] = destinations;

  return (
    <Section
      title={t('title')}
      subtitle={t('subtitle')}
      viewAllHref="/destinations"
      viewAllLabel={t('viewAll')}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <DestinationCard destination={lead} size="large" />
        <Rail label={t('title')} itemClassName="w-[15rem]" className="min-w-0">
          {rest.map((d) => (
            <DestinationCard key={d.id} destination={d} size="compact" />
          ))}
        </Rail>
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
      {/* A rail: six operators stacked three-across was 990px, and the
          homepage is meant to be a place people browse rather than a page they
          endure. "View all" in the header is where the full directory lives. */}
      <Rail label={t('title')} itemClassName="w-[19rem]">
        {businesses.map((b) => (
          <BusinessCard key={b.id} business={b} size="compact" />
        ))}
      </Rail>
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
      <Rail label={t('title')} itemClassName="w-[20rem]">
        {guides.map((g) => (
          <GuideCard key={g.id} guide={g} />
        ))}
      </Rail>
    </Section>
  );
}
