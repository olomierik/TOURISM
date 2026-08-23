import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SearchX } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { getCategories, getDestinations } from '@/lib/queries/taxonomy';
import { searchBusinesses } from '@/lib/queries/businesses';
import { BusinessCard } from '@/components/cards/business-card';
import { DirectoryFilters } from '@/components/directory/filters';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { QuoteCta } from '@/components/home/quote-cta';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'directory' });

  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: localeAlternates('/directory', locale),
  };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

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
  const categorySlug = first(sp.category);
  const destinationSlug = first(sp.destination);
  const rating = first(sp.rating);
  const verified = first(sp.verified);
  const sort = first(sp.sort);
  const page = Number(first(sp.page) ?? '1') || 1;

  const [categories, destinations, t, tNav] = await Promise.all([
    getCategories(locale),
    getDestinations(locale),
    getTranslations('directory'),
    getTranslations('nav'),
  ]);

  // Slugs come from the URL; ids go to the query. An unknown slug simply yields
  // no filter rather than an error, so a stale bookmark degrades to a wider
  // result set instead of a crash.
  const category = categories.find((c) => c.slug === categorySlug);
  const destination = destinations.find((d) => d.slug === destinationSlug);

  const results = await searchBusinesses(locale, {
    q,
    categoryId: category?.id,
    destinationId: destination?.id,
    minRating: rating ? Number(rating) : undefined,
    verifiedOnly: verified === '1',
    sort: sort === 'rating' || sort === 'name' ? sort : 'recommended',
    page,
    perPage: 12,
  });

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
      <div className="container-page pt-10">
        <Breadcrumbs
          locale={locale}
          items={[{ label: 'Explore Tanzania', href: '/' }, { label: tNav('directory') }]}
        />
      </div>

      <div className="container-page pb-section pt-8">
        <h1 className="text-4xl font-semibold sm:text-5xl">{t('title')}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>

        <div className="mt-12 grid gap-8 lg:grid-cols-[18rem_1fr]">
          <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
            <DirectoryFilters
              categories={categories}
              destinations={destinations}
              current={{ q, category: categorySlug, destination: destinationSlug, rating, verified, sort }}
            />
          </aside>

          <div>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t('showing', { count: results.total })}
            </p>

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
