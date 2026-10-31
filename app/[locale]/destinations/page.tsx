import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { localeAlternates } from '@/lib/seo';
import { getDestinations } from '@/lib/queries/taxonomy';
import { DestinationCard } from '@/components/cards/destination-card';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { EndBand } from '@/components/home/sections';
import { CountryTabs, pickCountry } from '@/components/layout/country-tabs';
import { PageHero } from '@/components/layout/page-hero';

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pageTitles' });
  const tHome = await getTranslations({ locale, namespace: 'home.destinations' });

  return {
    title: t('destinations'),
    description: tHome('subtitle'),
    alternates: localeAlternates('/destinations', locale),
  };
}

export default async function DestinationsPage({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;

  const [everything, t, tNav] = await Promise.all([
    getDestinations(locale),
    getTranslations('home.destinations'),
    getTranslations('nav'),
  ]);

  // Every country by default; the pills under the title narrow to one.
  const codes = everything.map((d) => (d.countryCode ?? 'TZ').toUpperCase());
  const country = pickCountry(sp.country, codes);
  const destinations = country
    ? everything.filter((d) => (d.countryCode ?? 'TZ').toUpperCase() === country)
    : everything;

  return (
    <>
      <PageHero
        breadcrumbs={
          <Breadcrumbs
            locale={locale}
            items={[
              { label: 'Explore Tanzania', href: '/' },
              { label: tNav('destinations') },
            ]}
          />
        }
        eyebrow={tNav('destinations')}
        title={t('title')}
        lead={t('subtitle')}
      >
        <CountryTabs
          locale={locale}
          codes={codes}
          current={country}
          hrefFor={(c) => (c ? { pathname: '/destinations', query: { country: c } } : '/destinations')}
        />
      </PageHero>

      <div className="container-page pb-section pt-6">

        {/* Four across on a desktop rather than three, and compact tiles rather
            than 4:3 blocks with two lines of prose under each. 46 destinations
            ran to seven screens; the same 46 now fit in about three, and a
            reader sees roughly twelve at once instead of six.

            The first six keep the larger treatment. A page where every tile is
            identical reads as a spreadsheet — giving the featured destinations
            more room is what makes the rest scannable rather than monotonous. */}
        {/* Four across on a desktop rather than three, and compact tiles rather
            than 4:3 blocks carrying two lines of prose each. 46 destinations
            ran to seven screens; the same 46 now fit in well under half that.

            The first tile spans two columns and two rows so compact tiles fill
            in beside it rather than below it. That is the difference between a
            feature that costs a screenful and one that costs nothing: a page
            where every tile is identical reads as a spreadsheet, and one where
            the feature pushes everything down defeats the point of shrinking
            the tiles at all. */}
        {/* A feature tile every eighth, not only the first.
        
            One feature at the top of 46 tiles sets a rhythm for the first row
            and then abandons it: everything from tile 2 to tile 45 is
            byte-identical, which is the wall this page was supposed to avoid.
            Recurring every eight puts a larger tile roughly once per screenful
            at every breakpoint, so the eye has somewhere to land as it goes
            down rather than only where it started.
        
            grid-flow-dense matters here and is easy to miss: a 2x2 tile in a
            3-column grid leaves a 1-wide gap beside it that later compact tiles
            cannot reach without it, so the page grows holes at exactly the
            breakpoints nobody checks. */}
        <div className="grid auto-rows-auto grid-flow-dense grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {destinations.map((d, i) => {
            const isFeature = i % 8 === 0;
            return (
              <DestinationCard
                key={d.id}
                destination={d}
                size={isFeature ? 'feature' : 'compact'}
                className={isFeature ? 'col-span-2 max-sm:aspect-[2/1] sm:row-span-2' : undefined}
              />
            );
          })}
        </div>
      </div>

      <EndBand />
    </>
  );
}
