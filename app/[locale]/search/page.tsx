import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  ArrowRight,
  Search as SearchIcon,
  MapPin,
  Star,
  ExternalLink,
  ShieldCheck,
  Compass,
  Building2,
  Phone,
} from 'lucide-react';
import Image from 'next/image';

import type { LocaleParams, Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { universalSearch, type SearchHit } from '@/lib/queries/universal-search';
import { searchGoogleMapsListings } from '@/lib/queries/maps';
import { countryName } from '@/lib/country-names';
import { BusinessCard } from '@/components/cards/business-card';
import { SearchBox } from '@/components/search/search-box';
import { Badge } from '@/components/ui/badge';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

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
    robots: { index: false, follow: true },
  };
}

const EAST_AFRICA_COUNTRIES = [
  { code: 'TZ', label: 'Tanzania', flag: '🇹🇿' },
  { code: 'KE', label: 'Kenya', flag: '🇰🇪' },
  { code: 'UG', label: 'Uganda', flag: '🇺🇬' },
  { code: 'RW', label: 'Rwanda', flag: '🇷🇼' },
];

const POPULAR_CATEGORIES = [
  { slug: 'safaris', label: 'Safaris & Wildlife' },
  { slug: 'trekking-hiking', label: 'Mountain Treks' },
  { slug: 'hotels-lodges', label: 'Lodges & Camps' },
  { slug: 'cultural-tours', label: 'Cultural Expeditions' },
  { slug: 'transport', label: 'Transport & 4x4' },
];

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
  const rawQ = first(sp.q);
  const query = rawQ?.trim() ?? '';
  const countryParam = first(sp.country)?.toUpperCase();
  const categoryParam = first(sp.category);
  const regionParam = first(sp.region);

  const t = await getTranslations({ locale, namespace: 'search' });

  // Run universal search if query is entered
  const results = query ? await universalSearch(query, locale as Locale) : null;

  // Effective country from param or intent detection
  const effectiveCountry = countryParam || results?.countryCode || undefined;

  // Run Google Maps regional search
  const mapsSearchTerm = query || (categoryParam ? `${categoryParam}` : 'safari lodge travel');
  const mapsListings = await searchGoogleMapsListings(mapsSearchTerm, {
    countryCode: effectiveCountry,
    category: categoryParam,
    region: regionParam,
    maxResults: 12,
  });

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
    results !== null &&
    grouped.length === 0 &&
    results.operators.items.length === 0 &&
    mapsListings.length === 0;

  return (
    <div className="container-page py-section">
      <header className="mx-auto max-w-2xl text-center sm:text-left">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Compass className="size-3.5" aria-hidden />
          <span>Google Maps & Regional Discovery</span>
        </div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t('h1')}</h1>
        <p className="mt-3 text-muted-foreground">{t('lede')}</p>

        <div className="mt-6">
          <SearchBox defaultValue={query} placeholder={t('placeholder')} label={t('label')} />
        </div>

        {/* Quick Country & Category Filter Chips */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Quick filters:</span>
          {EAST_AFRICA_COUNTRIES.map((c) => {
            const isSelected = countryParam === c.code;
            return (
              <Link
                key={c.code}
                href={{
                  pathname: '/search',
                  query: {
                    ...(query ? { q: query } : {}),
                    ...(isSelected ? {} : { country: c.code }),
                    ...(categoryParam ? { category: categoryParam } : {}),
                  },
                }}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'border bg-background text-foreground hover:bg-secondary/70'
                }`}
              >
                <span>{c.flag}</span>
                <span>{c.label}</span>
              </Link>
            );
          })}

          <span className="mx-1 text-muted-foreground/40">|</span>

          {POPULAR_CATEGORIES.map((cat) => {
            const isSelected = categoryParam === cat.slug;
            return (
              <Link
                key={cat.slug}
                href={{
                  pathname: '/search',
                  query: {
                    ...(query ? { q: query } : {}),
                    ...(countryParam ? { country: countryParam } : {}),
                    ...(isSelected ? {} : { category: cat.slug }),
                  },
                }}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-secondary text-secondary-foreground ring-1 ring-primary'
                    : 'border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>
      </header>

      <div className="mx-auto mt-10 max-w-5xl space-y-12">
        {/* Active Filter Indicators */}
        {(results?.countryCode || countryParam || categoryParam) && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-secondary/30 px-3.5 py-2 text-sm text-muted-foreground">
            <span>Narrowed to:</span>
            {(results?.countryCode || countryParam) && (
              <Badge variant="outline" className="bg-background">
                {countryName(countryParam || results?.countryCode || '', locale)}
              </Badge>
            )}
            {categoryParam && (
              <Badge variant="outline" className="bg-background">
                Category: {categoryParam}
              </Badge>
            )}
            <Link
              href={{ pathname: '/search', query: query ? { q: query } : {} }}
              className="ml-auto text-xs text-primary hover:underline"
            >
              Clear filters
            </Link>
          </div>
        )}

        {/* Empty State */}
        {nothing && (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <SearchIcon className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p className="mt-4 font-medium">{t('emptyTitle', { query })}</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {t('emptyBody')}
            </p>
          </div>
        )}

        {/* Google Maps Classified Regional Business Listings */}
        {mapsListings.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-semibold">
                    Google Maps Places Listings
                  </h2>
                  <Badge variant="verified" className="text-xs">
                    <ShieldCheck className="size-3" aria-hidden />
                    Verified Locations
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Classified businesses across Tanzania, Kenya, Uganda, and Rwanda with verified
                  locations and cover imagery
                </p>
              </div>

              <span className="text-xs text-muted-foreground">
                {mapsListings.length} {mapsListings.length === 1 ? 'business' : 'businesses'}
              </span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {mapsListings.map((biz) => {
                const countryFlag =
                  biz.countryCode === 'TZ'
                    ? '🇹🇿 Tanzania'
                    : biz.countryCode === 'KE'
                      ? '🇰🇪 Kenya'
                      : biz.countryCode === 'UG'
                        ? '🇺🇬 Uganda'
                        : biz.countryCode === 'RW'
                          ? '🇷🇼 Rwanda'
                          : biz.countryCode;

                return (
                  <article
                    key={biz.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {/* Cover Image */}
                    <div className="relative aspect-16/10 overflow-hidden bg-muted">
                      {biz.coverImageUrl ? (
                        <Image
                          src={biz.coverImageUrl}
                          alt={biz.name}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          quality={60}
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-secondary text-muted-foreground">
                          <Building2 className="size-10 opacity-30" />
                        </div>
                      )}

                      {/* Badges on Cover */}
                      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                        <Badge
                          variant="outline"
                          className="border-border/60 bg-card/90 font-medium text-xs backdrop-blur-sm"
                        >
                          {countryFlag}
                        </Badge>
                        {biz.tier === 'featured' && (
                          <Badge variant="featured" className="bg-card/90 backdrop-blur-sm">
                            Featured
                          </Badge>
                        )}
                        {biz.isVerified && (
                          <Badge variant="verified" className="bg-card/90 backdrop-blur-sm">
                            <ShieldCheck className="size-3" aria-hidden />
                            Verified
                          </Badge>
                        )}
                      </div>

                      {biz.categoryName && (
                        <div className="absolute bottom-2.5 left-3">
                          <span className="rounded-md bg-foreground/80 px-2 py-0.5 text-[11px] font-medium text-background backdrop-blur-xs">
                            {biz.categoryName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="font-display text-base font-semibold leading-snug">
                        <Link
                          href={{ pathname: '/business/[slug]', params: { slug: biz.slug } }}
                          className="hover:text-primary"
                        >
                          {biz.name}
                        </Link>
                      </h3>

                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {biz.tagline || biz.shortDescription}
                      </p>

                      {/* Location & Rating */}
                      <div className="mt-auto border-t pt-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5 text-primary" aria-hidden />
                            <span>
                              {biz.city}, {biz.region}
                            </span>
                          </span>

                          {biz.ratingAvg > 0 && (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <Star className="size-3.5 fill-warning text-warning" aria-hidden />
                              <span>{biz.ratingAvg.toFixed(1)}</span>
                              <span className="text-muted-foreground">({biz.ratingCount})</span>
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2">
                          <Link
                            href={{ pathname: '/business/[slug]', params: { slug: biz.slug } }}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            View details
                          </Link>

                          <div className="flex items-center gap-1.5">
                            {biz.whatsapp && (
                              <a
                                href={`https://wa.me/${biz.whatsapp.replace(/\+/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-secondary"
                                title="Chat on WhatsApp"
                              >
                                <Phone className="size-3" aria-hidden />
                                <span>WhatsApp</span>
                              </a>
                            )}
                            {biz.googleMapsUri && (
                              <a
                                href={biz.googleMapsUri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                                title="Open in Google Maps"
                              >
                                <ExternalLink className="size-3" aria-hidden />
                                <span>Maps</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Universal Search Reference Results (Destinations, Guides, Attractions, Events, Gems) */}
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

        {/* Universal Directory Operators (if any additional from Supabase) */}
        {results?.operators?.items && results.operators.items.length > 0 && (
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
    </div>
  );
}

