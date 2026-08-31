import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { universalSearch, type SearchHit } from '@/lib/queries/universal-search';
import { countryName } from '@/lib/country-names';
import { BusinessCard } from '@/components/cards/business-card';
import { SearchBox } from '@/components/search/search-box';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'search' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localeAlternates('/search', locale),
    // A results page is not something to index — the useful pages are the ones
    // it points at, and an indexed empty-query search is thin content.
    robots: { index: false, follow: true },
  };
}

/**
 * Search across everything.
 *
 * /directory searches operators, which was the whole site when it was built.
 * Since then the site has grown destinations with month-by-month conditions and
 * cost bands, guides, attractions, events and hidden gems — and typing "Ruaha"
 * returned a list of companies with no route to the page saying what a day
 * there costs.
 *
 * Reference results come first and operators second, deliberately. Somebody
 * typing a place name wants the place; somebody wanting companies is already on
 * the directory, which this page links to rather than trying to replace.
 */
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const raw = sp.q;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';

  const t = await getTranslations({ locale, namespace: 'search' });

  const results = query ? await universalSearch(query, locale) : null;

  const KINDS = ['destination', 'guide', 'attraction', 'event', 'gem'] as const;
  const kindLabel = (k: SearchHit['kind']) => t(`kind.${k}`);

  function hitHref(hit: SearchHit) {
    switch (hit.kind) {
      case 'destination':
      case 'gem':
        return { pathname: '/destinations/[slug]' as const, params: { slug: hit.slug } };
      case 'guide':
        return { pathname: '/guides/[slug]' as const, params: { slug: hit.slug } };
      case 'event':
        return { pathname: '/events' as const };
      case 'attraction':
        return {
          pathname: '/destinations/[slug]' as const,
          params: { slug: hit.parentSlug ?? hit.slug },
        };
    }
  }

  const grouped = KINDS.map((kind) => ({
    kind,
    hits: (results?.reference ?? []).filter((h) => h.kind === kind),
  })).filter((g) => g.hits.length > 0);

  const nothing =
    results !== null && grouped.length === 0 && results.operators.items.length === 0;

  return (
    <div className="container-page py-section">
      <header className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t('h1')}</h1>
        <p className="mt-3 text-muted-foreground">{t('lede')}</p>
        <div className="mt-6">
          <SearchBox defaultValue={query} placeholder={t('placeholder')} label={t('label')} />
        </div>
      </header>

      {results && (
        <div className="mx-auto mt-12 max-w-4xl space-y-12">
          {/* Country intent is stripped from the term before searching, so say
              so — otherwise "tanzania safari" looks like it ignored a word. */}
          {results.countryCode && (
            <p className="text-sm text-muted-foreground">
              {t('narrowed', {
                country: countryName(results.countryCode, locale),
                term: results.term,
              })}
            </p>
          )}

          {nothing && (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <SearchIcon className="mx-auto size-8 text-muted-foreground" aria-hidden />
              <p className="mt-4 font-medium">{t('emptyTitle', { query })}</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {t('emptyBody')}
              </p>
            </div>
          )}

          {grouped.map(({ kind, hits }) => (
            <section key={kind}>
              <h2 className="border-b pb-2 font-display text-xl font-semibold">
                {kindLabel(kind)}
              </h2>
              <ul className="mt-4 space-y-3">
                {hits.map((hit) => (
                  <li key={`${hit.kind}-${hit.slug}-${hit.title}`}>
                    <Link
                      href={hitHref(hit)}
                      className="group block rounded-xl border p-4 transition-colors hover:bg-secondary/40"
                    >
                      <span className="font-medium group-hover:text-primary">{hit.title}</span>
                      {hit.subtitle && (
                        <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-muted-foreground">
                          {hit.subtitle}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {results.operators.items.length > 0 && (
            <section>
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b pb-2">
                <h2 className="font-display text-xl font-semibold">{t('operators')}</h2>
                <Link
                  href={{ pathname: '/directory', query: { q: results.term } }}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  {t('allOperators', { count: results.operators.total })}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {results.operators.items.slice(0, 6).map((b) => (
                  <BusinessCard key={b.id} business={b} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
