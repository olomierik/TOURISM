import { Fragment } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Map as MapIcon } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link, getPathname } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { getCategories, getDestinations } from '@/lib/queries/taxonomy';
import { searchBusinesses } from '@/lib/queries/businesses';
import { getCountriesWithBusinessCounts, getFacetCounts } from '@/lib/queries/countries';
import { getRegionsByCountry } from '@/lib/queries/regions';
import { detectCountryIntent } from '@/lib/search/country-intent';
import { countryName } from '@/lib/country-names';
import { BusinessCard } from '@/components/cards/business-card';
import { AdSlot } from '@/components/ads/ad-slot';
import { PinMap, type Pin } from '@/components/map/pin-map';
import { FilterBar } from '@/components/directory/filter-bar';
import { Pagination, PER_PAGE } from '@/components/directory/pagination';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { EndBand } from '@/components/home/sections';

/** §6.7 sort options, in the order the spec lists them. */
const SORTS = ['recommended', 'rating', 'reviews', 'price', 'newest'] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * The title has to change with the filter.
 *
 * "Tours & Safaris" and "Businesses" in the navigation both land here, and with
 * one shared heading they read as the same page — the results differ, 830
 * against 1,330, but nothing above the fold says so, so a visitor who clicks
 * both concludes the second link is broken.
 *
 * It is also a duplicate-content signal. /directory and
 * /directory?category=safaris shipped the same <title>, the same description
 * and the same <h1>, which is Google being told two URLs are the same page.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams>;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: 'directory' });

  const categorySlug = first(sp.category);
  const destinationSlug = first(sp.destination);
  const regionSlug = first(sp.region);

  const [categories, destinations] = await Promise.all([
    categorySlug ? getCategories(locale) : Promise.resolve([]),
    destinationSlug ? getDestinations(locale) : Promise.resolve([]),
  ]);

  const category = categories.find((c) => c.slug === categorySlug);
  const destination = destinations.find((d) => d.slug === destinationSlug);

  const title = category
    ? destination
      ? t('titleCategoryIn', { category: category.name, place: destination.name })
      : t('titleCategory', { category: category.name })
    : destination
      ? t('titleIn', { place: destination.name })
      : t('title');

  return {
    title,
    description: t('subtitle'),
    // A filtered view is a slice of the directory, not a page of its own. The
    // canonical points home so the filters do not compete with it in the index.
    alternates: {
      ...localeAlternates('/directory', locale),
      ...(categorySlug || destinationSlug || regionSlug ? { canonical: '/directory' } : {}),
    },
    ...(categorySlug || destinationSlug || regionSlug
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}

export default async function DirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const q = first(sp.q);
  const countryCode = first(sp.country);
  const regionSlug = first(sp.region);
  const categorySlug = first(sp.category);
  const destinationSlug = first(sp.destination);
  const rating = first(sp.rating);
  const verified = first(sp.verified);
  const sort = first(sp.sort);
  const page = Number(first(sp.page) ?? '1') || 1;
  const anywhere = first(sp.anywhere) === '1';

  // Someone typing a country name is saying where they want to go, not asking
  // for every listing that mentions the word. Without this, "tanzania" returned
  // six Nairobi operators whose business name is "Kenya and Tanzania Safaris" —
  // a correct text match and the wrong answer.
  //
  // Only when no country was chosen in the dropdown, which always wins, and only
  // when the reader has not asked to search everywhere.
  const intent = countryCode || anywhere ? null : detectCountryIntent(q);
  // §9.3: "Default country filter = Tanzania on all listing surfaces." The
  // directory spans four countries and showed all of them, which made a
  // four-country directory look like the product when Tanzania is — 1,521 of
  // the 2,618 approved listings are Tanzanian and every page title says so.
  // The other three stay reachable through the "Include Kenya, Uganda and
  // Rwanda" switch in the FilterBar, and keep their URLs.
  const effectiveCountry = countryCode ?? intent?.code ?? (anywhere ? undefined : 'TZ');
  const effectiveQ = intent ? intent.rest || undefined : q;

  const [categories, destinations, countries, regionGroups, facets, t, tNav, tMap] =
    await Promise.all([
      getCategories(locale),
      getDestinations(locale),
      getCountriesWithBusinessCounts(),
      getRegionsByCountry(),
      getFacetCounts(),
      getTranslations('directory'),
      getTranslations('nav'),
      getTranslations('map'),
    ]);

  // Slugs come from the URL; ids go to the query. An unknown slug simply yields
  // no filter rather than an error, so a stale bookmark degrades to a wider
  // result set instead of a crash.
  const category = categories.find((c) => c.slug === categorySlug);
  const destination = destinations.find((d) => d.slug === destinationSlug);
  const chosenRegion = regionGroups.flatMap((g) => g.regions).find((r) => r.slug === regionSlug);

  // A region from one country and a country filter naming another cannot both
  // be satisfied, and the honest answer to a contradiction is not an empty
  // page. The country wins and the region is dropped, which is what somebody
  // who has just switched from Tanzania to Kenya meant — the stale 'Arusha'
  // still sitting in the second dropdown is not a choice they made. Same rule
  // as an unknown slug directly above: degrade to the wider result set.
  const region =
    chosenRegion && effectiveCountry && chosenRegion.countryCode !== effectiveCountry
      ? undefined
      : chosenRegion;

  // Grouped region options, busiest first inside each group. A reader scanning
  // for somewhere to start is better served by Arusha at the top than by Arusha
  // buried alphabetically between Dar es Salaam and Dodoma.
  const regionsForBar = regionGroups
    .map((group) => ({
      group: group.countryName,
      options: group.regions
        .filter((r) => (facets.byRegion.get(r.id) ?? 0) > 0)
        .sort(
          (a, b) =>
            (facets.byRegion.get(b.id) ?? 0) - (facets.byRegion.get(a.id) ?? 0) ||
            a.name.localeCompare(b.name),
        )
        .map((r) => ({ value: r.slug, label: r.name, count: facets.byRegion.get(r.id) ?? 0 })),
    }))
    .filter((group) => group.options.length > 0);

  const hasFilters = Boolean(
    q || regionSlug || categorySlug || destinationSlug || rating || verified || anywhere,
  );

  const results = await searchBusinesses(locale, {
    q: effectiveQ,
    countryCode:
      effectiveCountry && /^[A-Za-z]{2}$/.test(effectiveCountry)
        ? effectiveCountry.toUpperCase()
        : undefined,
    regionId: region?.id,
    categoryId: category?.id,
    destinationId: destination?.id,
    minRating: rating ? Number(rating) : undefined,
    verifiedOnly: verified === '1',
    sort: sort === 'rating' || sort === 'name' ? sort : 'recommended',
    page,
    // §6.8: 24 per page, not 12. Twelve made 219 pages of a 2,618-row
    // directory and put the pagination control twice as often in front of
    // somebody who is scanning.
    perPage: PER_PAGE,
  });

  // From the results that were already fetched, so the map cannot show a
  // different set of businesses than the cards below it.
  const pins: Pin[] = results.items.flatMap((b) =>
    b.lat === null || b.lng === null
      ? []
      : [
          {
            id: b.id,
            slug: b.slug,
            name: b.name,
            lat: b.lat,
            lng: b.lng,
            isVerified: b.isVerified,
            tagline: b.tagline,
            precision: b.precision,
            city: b.city,
            href: getPathname({
              href: { pathname: '/business/[slug]', params: { slug: b.slug } },
              locale,
            }),
          },
        ],
  );

  // Preserve every active filter when paging, and land on the results.
  //
  // Without the hash, paging returned the reader to the top of the document:
  // measured at 1440x900, clicking Next from the pagination control moved the
  // scroll position from 1477 back to 0, past the search band, the filters and
  // the map, so reaching the next page's Next button meant scrolling the same
  // 1,600 pixels again. Paging is the one action somebody repeats, which made
  // it the worst place on the site to lose your position.
  //
  // A fragment rather than scroll={false}: staying put would leave the reader
  // looking at the bottom of a page whose first eight cards they had not seen.
  // html already carries scroll-padding-top for the sticky header, so the
  // target clears it without anything new.
  const pageHref = (n: number) => ({
    pathname: '/directory' as const,
    hash: 'directory-results',
    query: {
      ...(q ? { q } : {}),
      // country and region were missing here: paging past page 1 silently
      // dropped them and widened the result set the reader had narrowed.
      ...(countryCode ? { country: countryCode } : {}),
      // region, not regionSlug: a region dropped for conflicting with the
      // country must not come back on page 2.
      ...(region ? { region: region.slug } : {}),
      ...(categorySlug ? { category: categorySlug } : {}),
      ...(destinationSlug ? { destination: destinationSlug } : {}),
      ...(rating ? { rating } : {}),
      ...(verified ? { verified } : {}),
      ...(sort ? { sort } : {}),
      ...(n > 1 ? { page: String(n) } : {}),
    },
  });

  return (
    <>
      {/* A search band rather than a plain heading. This page is reached from a
          search as often as it is browsed to, and arriving at a wall of filters
          with no obvious way to just type is where people bounce back to
          Google. Same component as the homepage hero, carrying the current
          query — a search bar that forgets what was searched makes refining a
          query mean retyping it. */}
      {/* A light band rather than the dark navy one: GetYourGuide and Viator
          keep results pages white, with the photographs as the only colour. */}
      <div className="border-b bg-muted">
        <div className="container-page pb-8 pt-6">
          <Breadcrumbs
            locale={locale}
            items={[{ label: 'Explore Tanzania', href: '/' }, { label: tNav('directory') }]}
          />

          {/* Names what is actually being shown. Two nav items land here and
              a shared heading makes them read as one page. */}
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            {category
              ? destination
                ? t('titleCategoryIn', { category: category.name, place: destination.name })
                : t('titleCategory', { category: category.name })
              : destination
                ? t('titleIn', { place: destination.name })
                : t('title')}
          </h1>
          {/* §7.2.3: a lead with the live count. The number is the page's
              first useful fact and it was only available 200px lower. */}
          <p className="mt-2 max-w-2xl text-body-lg text-muted-foreground">
            {category?.summary ?? t('subtitle')}
          </p>
        </div>
      </div>

      {/* One column now. The filters used to be an 18rem sidebar standing 715px
          tall, which cost a quarter of the width for the whole scroll and put
          its own submit button below the fold. As a sticky row they cost ~70px
          once, and the listings get the full measure — which is what a
          comparison surface wants, since a wider row fits more of the name,
          place and rating a reader is actually scanning. */}
      <div className="container-page pb-section">
        <div>
          <FilterBar
            categories={categories.map((c) => ({
              value: c.slug,
              label: c.name,
              count: facets.byCategory.get(c.id) ?? 0,
            }))}
            destinations={destinations.map((d) => ({
              value: d.slug,
              label: d.name,
              count: facets.byDestination.get(d.id) ?? 0,
            }))}
            regions={regionsForBar}
            sorts={SORTS.map((value) => ({ value, label: t(`sort_${value}`) }))}
            ratings={['4', '4.5'].map((value) => ({
              value,
              label: t('ratingAtLeast', { rating: value }),
            }))}
            anyRated={facets.anyRated}
            total={results.total}
            current={{
              q,
              region: region?.slug,
              category: categorySlug,
              destination: destinationSlug,
              rating,
              verified,
              sort,
              anywhere: anywhere ? '1' : undefined,
            }}
          />

          <div className="pt-6">
            <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
              {t('showing', { count: results.total })}
            </p>

            {/*
              Never filter silently. Narrowing someone's results without saying
              so leaves nothing on the page to explain where the rest went, which
              is worse than showing too many — so the inference is stated and the
              way out is one click.
            */}
            {intent && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="text-muted-foreground">
                  {t('countryInferred', {
                    country: countryName(
                      intent.code,
                      locale,
                      countries.find((c) => c.code === intent.code)?.name,
                    ),
                  })}
                </span>
                <Link
                  href={{ pathname: '/directory', query: { q, anywhere: '1' } }}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {t('searchAnywhere')}
                </Link>
              </p>
            )}

            {results.items.length === 0 ? (
              // §6.12's EmptyState, and §7.2 "Empty and loading": one action,
              // and the action is "Clear filters" when there are filters to
              // clear. Offering a quote request to somebody whose filter
              // matched nothing answers a question they did not ask.
              <EmptyState
                className="mt-8"
                title={t('noResults')}
                help={t('noResultsHelp')}
                action={
                  <Button asChild variant={hasFilters ? 'secondary' : 'primary'}>
                    <Link href={hasFilters ? '/directory' : '/request-quote'}>
                      {hasFilters ? t('clearAll') : tNav('requestQuote')}
                    </Link>
                  </Button>
                }
              />
            ) : (
              <>
                {/* This page of results, on a map. It is this page and not the
                    whole directory on purpose: the map answers "where are the
                    ones I am looking at", and 1,330 pins answer nothing. Pins
                    drawn from a town name rather than an address are shown as
                    an area and say so when opened. */}
                {/* Behind a toggle, as on GetYourGuide. Open by default it took
                    ~400px above the first result, so a reader landing here saw a
                    map and no listings. A native <details> needs no JavaScript,
                    and the map only loads once it is opened (PinMap waits until
                    it is on screen). */}
                {pins.length > 0 && (
                  <details className="group mt-4">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-semibold shadow-xs transition-colors hover:bg-secondary [&::-webkit-details-marker]:hidden">
                      <MapIcon className="size-4 text-primary" aria-hidden />
                      <span className="group-open:hidden">{tMap('show')}</span>
                      <span className="hidden group-open:inline">{tMap('hide')}</span>
                    </summary>
                    <PinMap
                      className="mt-4"
                      pins={pins}
                      center={null}
                      label={tMap('directoryLabel')}
                    />
                    {/* The count, because a map is read as a complete picture
                        and this one is not. 73 approved listings have nothing
                        to place them by, and they sort near the top of the
                        default view — so a page of twelve can put two pins on
                        the map. Saying which is which costs a line. */}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {tMap('shownOf', {
                        shown: pins.length,
                        total: results.items.length,
                      })}
                    </p>
                  </details>
                )}

                {/* Compact cards, three across even with the filter rail
                    taking a column of the page. A directory is a scan surface:
                    the reader is comparing names and places, and the tagline
                    and day rate that made each card 347px tall are both on the
                    listing they are about to open. */}
                <div
                  id="directory-results"
                  className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {results.items.map((b, i) => (
                    <Fragment key={b.id}>
                      <BusinessCard business={b} size="responsive" />
                      {/* One ad, across the row, after the eighth result: far
                          enough down that the first screen is all listings. */}
                      {i === 7 && <AdSlot surface="directory-feed" className="col-span-full my-2" />}
                    </Fragment>
                  ))}
                </div>

                <Pagination
                  page={results.page}
                  totalPages={results.totalPages}
                  total={results.total}
                  hrefFor={pageHref}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <EndBand />
    </>
  );
}
