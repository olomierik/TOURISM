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
    getDestinations(locale, { limit: 8 }),
    getTranslations('home.destinations'),
  ]);

  if (destinations.length === 0) return null;

  // A rail, like the operators above and the guides below.
  //
  // This was a large lead tile beside a rail of the rest, and the reasoning
  // was sound while the lead was portrait. Measured, it was not: `aspect-[3/4]`
  // on a 461px column made the lead 615px, standing beside rail tiles of the
  // same kind of thing at 160px — four times taller, and the single largest
  // object on the homepage. The whole section was 826px for six links.
  //
  // Two attempts at keeping the split both failed on the same arithmetic. A
  // landscape lead is 346px and the rail beside it is 160px, so the grid
  // stretched 186px of empty track next to it; replacing the rail with a 2×2
  // grid made it worse, because the right column is 738px wide and cards that
  // wide are 241px tall, taking the section to 666px.
  //
  // A rail of eight is 326px and has no leftovers. The variety the lead was
  // there to provide now comes from the two hairline row-lists directly below,
  // which are a genuinely different object rather than the same card at two
  // sizes — and eight destinations show where six did.
  return (
    <Section
      title={t('title')}
      subtitle={t('subtitle')}
      viewAllHref="/destinations"
      viewAllLabel={t('viewAll')}
    >
      <Rail label={t('title')} itemClassName="w-[15rem]">
        {destinations.map((d) => (
          <DestinationCard key={d.id} destination={d} size="compact" />
        ))}
      </Rail>
    </Section>
  );
}

export async function FeaturedOperators({
  locale,
  className,
}: {
  locale: Locale;
  /** Lets the homepage tighten the gap when this sits directly under the hero. */
  className?: string;
}) {
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
      className={className}
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
