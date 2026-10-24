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
    getDestinations(locale, { limit: 7 }),
    getTranslations('home.destinations'),
  ]);

  if (destinations.length === 0) return null;
  const [first, ...rest] = destinations;

  // A bento (Savanna Modern, 2026-10): the first destination large, six
  // around it.
  //
  // An earlier lead-tile layout failed because its tiles took their height
  // from an aspect ratio: a portrait lead stood four times taller than the
  // tiles beside it and the grid stretched empty track next to it. Here the
  // grid sets the heights (fixed rows) and every tile fills its cell, so the
  // lead is exactly two rows and nothing is left over: two columns on a phone
  // with the lead across both, four from lg with the lead two rows tall.
  return (
    <Section
      eyebrow={t('eyebrow')}
      title={t('title')}
      subtitle={t('subtitle')}
      viewAllHref="/destinations"
      viewAllLabel={t('viewAll')}
      size="lg"
    >
      <div className="grid auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[14rem] sm:gap-4 lg:auto-rows-[15rem] lg:grid-cols-4">
        <DestinationCard destination={first} size="feature" className="col-span-2 row-span-2 lg:col-span-1" />
        {rest.map((d) => (
          <DestinationCard key={d.id} destination={d} size="tile" />
        ))}
      </div>
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
    getFeaturedBusinesses(locale, 4),
    getTranslations('home.featured'),
  ]);

  if (businesses.length === 0) return null;

  return (
    <Section
      eyebrow={t('eyebrow')}
      title={t('title')}
      subtitle={t('subtitle')}
      viewAllHref="/directory"
      viewAllLabel={t('viewAll')}
      className={className}
      size="lg"
    >
      {/* Four across from lg (Savanna Modern). Two on a phone, so the section
          stays about a screen and a half; the directory link sits under them. */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 max-sm:[&>*:nth-child(n+3)]:hidden">
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
      eyebrow={t('eyebrow')}
      title={t('title')}
      subtitle={t('subtitle')}
      viewAllHref="/guides"
      viewAllLabel={t('viewAll')}
      size="lg"
    >
      {/* A rail on phones and tablets, where three cards don't fit; from lg the
          three fill the row, so the rail doesn't end in empty space. */}
      <Rail label={t('title')} itemClassName="w-[20rem] lg:w-[calc((100%-2rem)/3)]">
        {guides.map((g) => (
          <GuideCard key={g.id} guide={g} />
        ))}
      </Rail>
    </Section>
  );
}
