import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SearchX } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link, getPathname } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { getCategories, getDestinations } from '@/lib/queries/taxonomy';
import { searchBusinesses } from '@/lib/queries/businesses';
import { getCountriesWithBusinessCounts, getFacetCounts } from '@/lib/queries/countries';
import { detectCountryIntent } from '@/lib/search/country-intent';
import { countryName } from '@/lib/country-names';
import { BusinessCard } from '@/components/cards/business-card';
import { PinMap, type Pin } from '@/components/map/pin-map';
import { DirectoryFilters } from '@/components/directory/filters';
import { DiscoverySearch } from '@/components/home/discovery-search';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { QuoteCta } from '@/components/home/quote-cta';

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
      ...(categorySlug || destinationSlug ? { canonical: '/directory' } : {}),
    },
    ...(categorySlug || destinationSlug ? { robots: { index: false, follow: true } } : {}),
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
  const effectiveCountry = countryCode ?? intent?.code;
  const effectiveQ = intent ? intent.rest || undefined : q;

  const [categories, destinations, countries, facets, t, tNav, tMap] = await Promise.all([
    getCategories(locale),
    getDestinations(locale),
    getCountriesWithBusinessCounts(),
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

  const results = await searchBusinesses(locale, {
    q: effectiveQ,
    countryCode:
      effectiveCountry && /^[A-Za-z]{2}$/.test(effectiveCountry)
        ? effectiveCountry.toUpperCase()
        : undefined,
    categoryId: category?.id,
    destinationId: destination?.id,
    minRating: rating ? Number(rating) : undefined,
    verifiedOnly: verified === '1',
    sort: sort === 'rating' || sort === 'name' ? sort : 'recommended',
    page,
    perPage: 12,
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

  // Preserve every active filter when paging.
  const pageHref = (n: number) => ({
    pathname: '/directory' as const,
    query: {
      ...(q ? { q } : {}),
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
      <div className="bg-primary text-primary-foreground">
        <div className="container-page pb-10 pt-8">
          {/* Wrapped rather than given a className: Breadcrumbs is shared, and
              widening its API for one caller's colour is how shared components
              acquire props nobody else uses. */}
          <div className="[&_*]:text-primary-foreground/70 [&_a:hover]:text-primary-foreground">
            <Breadcrumbs
              locale={locale}
              items={[{ label: 'Explore Tanzania', href: '/' }, { label: tNav('businesses') }]}
            />
          </div>

          {/* Names what is actually being shown. Two nav items land here and
              a shared heading makes them read as one page. */}
          <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
            {category
              ? destination
                ? t('titleCategoryIn', { category: category.name, place: destination.name })
                : t('titleCategory', { category: category.name })
              : destination
                ? t('titleIn', { place: destination.name })
                : t('title')}
          </h1>
          <p className="mt-3 max-w-2xl text-primary-foreground/80">
            {category?.summary ?? t('subtitle')}
          </p>

          <div className="mt-7 max-w-4xl">
            <DiscoverySearch
              categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
              destinations={destinations.map((d) => ({ slug: d.slug, name: d.name }))}
              defaults={{
                q: q ?? '',
                category: categorySlug ?? '',
                destination: destinationSlug ?? '',
              }}
            />
          </div>
        </div>
      </div>

      <div className="container-page pb-section pt-10">
        <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
          <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
            <DirectoryFilters
              categories={categories}
              destinations={destinations}
              countries={countries}
              facets={facets}
              locale={locale}
              current={{ q, country: effectiveCountry, category: categorySlug, destination: destinationSlug, rating, verified, sort }}
            />
          </aside>

          <div>
            <p className="text-sm text-muted-foreground" aria-live="polite">
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
              <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed py-16 text-center">
                <SearchX className="size-8 text-muted-foreground" aria-hidden />
                <h2 className="mt-5 text-xl font-semibold">{t('noResults')}</h2>
                <p className="mt-2.5 max-w-md text-muted-foreground">{t('noResultsHelp')}</p>
                <Button asChild className="mt-7">
                  <Link href="/request-quote">{tNav('requestQuote')}</Link>
                </Button>
              </div>
            ) : (
              <>
                {/* This page of results, on a map. It is this page and not the
                    whole directory on purpose: the map answers "where are the
                    ones I am looking at", and 1,330 pins answer nothing. Pins
                    drawn from a town name rather than an address are shown as
                    an area and say so when opened. */}
                {pins.length > 0 && (
                  <>
                    <PinMap
                      className="mt-5"
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
                  </>
                )}

                <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {results.items.map((b) => (
                    <BusinessCard key={b.id} business={b} />
                  ))}
                </div>

                {results.totalPages > 1 && (
                  <nav
                    className="mt-12 flex items-center justify-between gap-4"
                    aria-label="Pagination"
                  >
                    {results.page > 1 ? (
                      <Button asChild variant="outline">
                        <Link href={pageHref(results.page - 1)}>{t('previous')}</Link>
                      </Button>
                    ) : (
                      <span />
                    )}

                    <span className="text-sm text-muted-foreground">
                      {t('page', { page: results.page, total: results.totalPages })}
                    </span>

                    {results.page < results.totalPages ? (
                      <Button asChild variant="outline">
                        <Link href={pageHref(results.page + 1)}>{t('next')}</Link>
                      </Button>
                    ) : (
                      <span />
                    )}
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <QuoteCta />
    </>
  );
}
