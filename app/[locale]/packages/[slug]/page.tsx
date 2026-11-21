import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  BadgeCheck,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  MessageCircle,
  Plane,
  Settings2,
  Star,
  X,
} from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { getPathname, Link } from '@/i18n/navigation';
import { localeAlternatesFromSlugs, absoluteUrl } from '@/lib/seo';
import { describe, packageTitle } from '@/lib/seo-templates';
import {
  getPackageBySlug,
  getAllPackageLocaleSlugs,
  getPackageTranslationLocales,
  getPackagesForBusiness,
  getPackagesForDestination,
} from '@/lib/queries/packages';
import { getDestinations } from '@/lib/queries/taxonomy';
import { formatPrice } from '@/lib/format';
import { ConvertedPrice, CurrencyPicker } from '@/components/currency/converted-price';
import { replyHours, showsRating } from '@/lib/badges';
import { orderByItinerary, parseItinerary } from '@/lib/tours/itinerary';
import { whatsappHref, whatsappNumberFor } from '@/lib/contact/whatsapp';
import { MediaFallback } from '@/components/media/media-fallback';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { PackageCard } from '@/components/cards/package-card';
import { SectionTabs } from '@/components/tours/section-tabs';
import { RememberTour, RecentlyViewedTours } from '@/components/tours/recently-viewed';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageView } from '@/components/analytics/page-view';
import { cn } from '@/lib/utils';

/**
 * A tour page, laid out the way SafariBookings lays one out (owner's call,
 * 14 November 2026): the photograph and title, a price with one button and
 * the reassurances that make pressing it safe, then a tab bar — Overview,
 * Day by day, Rates, Inclusions, Getting there, Offered by — over sections
 * that are all on the page.
 *
 * Built on what tours here actually carry, measured that day:
 *
 *   - **No tour has a cover photo.** The hero uses the first destination on
 *     the route instead, which is a photograph that loads, and says which
 *     place it shows. A grey box above a $5,000 itinerary is the worst first
 *     screen the page could have.
 *   - **Every itinerary is written "Day 1: …, Day 2: …"** in one text field.
 *     lib/tours/itinerary.ts divides it into days without rewriting a word;
 *     a tour whose text has no day headings is shown as written.
 *   - **No tour has an inclusion list yet.** That tab appears when one does.
 *
 * Tabs with nothing to say are left out rather than shown empty — an empty
 * "Inclusions" tab reads as "nothing is included".
 */

type Params = { locale: Locale; slug: string };

/**
 * The international airport for a start city, where there is exactly one
 * answer. Only cities whose airport is not a judgement call; anything else
 * says where the tour starts and stops there.
 */
const AIRPORTS: Record<string, string> = {
  arusha: 'Kilimanjaro International Airport (JRO)',
  moshi: 'Kilimanjaro International Airport (JRO)',
  nairobi: 'Jomo Kenyatta International Airport (NBO)',
  zanzibar: 'Abeid Amani Karume International Airport (ZNZ)',
  'stone town': 'Abeid Amani Karume International Airport (ZNZ)',
  'dar es salaam': 'Julius Nyerere International Airport (DAR)',
  kigali: 'Kigali International Airport (KGL)',
  entebbe: 'Entebbe International Airport (EBB)',
  kampala: 'Entebbe International Airport (EBB)',
};

/** Only the languages each tour is written in: the others would build as 404s. */
export async function generateStaticParams() {
  const packages = await getAllPackageLocaleSlugs();
  return packages.flatMap(({ slug, locales: written }) => written.map((locale) => ({ locale, slug })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const [pkg, written] = await Promise.all([getPackageBySlug(slug, locale), getPackageTranslationLocales(slug)]);
  if (!pkg) return {};

  return {
    // T8: length, start and price in the result, from the tour itself.
    title:
      locale === 'en'
        ? packageTitle({ title: pkg.title, days: pkg.durationDays, startCity: pkg.startCity, price: pkg.priceFrom })
        : (pkg.seoTitle ?? pkg.title),
    description:
      locale === 'en' ? describe(pkg.seoDescription ?? pkg.summary) : (pkg.seoDescription ?? pkg.summary ?? undefined),
    // Only languages the tour is written in; see getPackageTranslationLocales.
    alternates: localeAlternatesFromSlugs(
      '/packages/[slug]',
      Object.fromEntries(written.map((l) => [l, slug])),
      locale,
    ),
    openGraph: { type: 'article', title: pkg.title, description: pkg.summary ?? undefined },
  };
}

export default async function TourPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const pkg = await getPackageBySlug(slug, locale);
  if (!pkg) {
    // A tour that exists, but not in this language: send the reader (and the
    // German, French and Italian URLs Google already knows) to a language it
    // is written in, permanently, rather than a 404.
    const written = await getPackageTranslationLocales(slug);
    const to = written.includes('en') ? 'en' : written[0];
    if (to && to !== locale) {
      permanentRedirect(getPathname({ href: { pathname: '/packages/[slug]', params: { slug } }, locale: to }));
    }
    notFound();
  }

  const [destinations, t, tPkg, tTours, tCommon, tNav, sameOperator] = await Promise.all([
    getDestinations(locale),
    getTranslations('tourPage'),
    getTranslations('package'),
    getTranslations('tours'),
    getTranslations('common'),
    getTranslations('nav'),
    getPackagesForBusiness(pkg.business.id, locale),
  ]);

  const itinerary = parseItinerary(pkg.itinerary);

  // The route in travel order. The saved order is the order the operator
  // ticked the boxes, so the stops are placed by where the day-by-day text
  // first names them (lib/tours/itinerary.ts). Matched against the days only:
  // a heading like "12 Days North Tanzania & Zanzibar" above Day 1 would put
  // the last stop first.
  const byId = new Map(destinations.map((d) => [d.id, d]));
  const saved = pkg.destinationIds.map((id) => byId.get(id)).filter((d): d is NonNullable<typeof d> => Boolean(d));
  const daysText = itinerary.days.length
    ? itinerary.days.map((d) => [d.title, ...d.body].join(' ')).join(' \n ')
    : pkg.itinerary;
  const route = orderByItinerary(saved, daysText);
  const related = route[0]
    ? (await getPackagesForDestination(route[0].id, locale, 4)).filter((p) => p.slug !== pkg.slug).slice(0, 3)
    : [];
  const moreByOperator = sameOperator.filter((p) => p.slug !== pkg.slug).slice(0, 3);

  const heroSrc = pkg.coverImageUrl ?? route.find((d) => d.coverImageUrl)?.coverImageUrl ?? null;
  const heroPlace = pkg.coverImageUrl ? null : route.find((d) => d.coverImageUrl)?.name ?? null;

  const included = pkg.inclusions.filter((i) => i.isIncluded);
  const excluded = pkg.inclusions.filter((i) => !i.isIncluded);
  const airport = pkg.startCity ? AIRPORTS[pkg.startCity.trim().toLowerCase()] : undefined;

  const price = pkg.priceFrom !== null ? formatPrice(pkg.priceFrom, pkg.currency, locale) : null;
  const unit = pkg.priceUnit === 'per_person' ? tCommon('perPerson') : t('perGroup');
  const hours = replyHours(pkg.business.avgResponseMinutes);
  const rated = showsRating(pkg.business.ratingCount);

  const wa =
    !pkg.isDemo &&
    /^[0-9a-f-]{36}$/i.test(pkg.business.id) &&
    whatsappNumberFor({
      whatsapp: pkg.business.whatsapp,
      phone: pkg.business.phone,
      countryCode: pkg.business.countryCode,
    })
      ? whatsappHref(pkg.business.id, 'package', locale, { packageSlug: pkg.slug })
      : null;
  const quoteHref = { pathname: '/request-quote' as const, query: { package: pkg.slug } };

  // Facts about the tour, each only when the operator has said it.
  const features: Array<{ yes: boolean; label: string }> = [];
  if (pkg.tourStyle) features.push({ yes: true, label: tTours(`style_${pkg.tourStyle}`) });
  if (pkg.comfortLevel) features.push({ yes: true, label: tTours(`comfort_${pkg.comfortLevel}`) });
  if (pkg.isCustomizable) features.push({ yes: true, label: tTours('customizable') });
  if (pkg.minTravelers && pkg.minTravelers >= 2) features.push({ yes: false, label: t('soloNo') });
  if (pkg.minTravelers === 1) features.push({ yes: true, label: t('soloYes') });
  if (pkg.maxGroupSize) features.push({ yes: true, label: t('groupUpTo', { count: pkg.maxGroupSize }) });

  const tabs = [
    { id: 'overview', label: t('tabOverview') },
    ...(itinerary.days.length || itinerary.intro.length ? [{ id: 'day-by-day', label: t('tabDays') }] : []),
    ...(price ? [{ id: 'rates', label: t('tabRates') }] : []),
    ...(pkg.inclusions.length ? [{ id: 'inclusions', label: t('tabInclusions') }] : []),
    ...(pkg.startCity || route.length ? [{ id: 'getting-there', label: t('tabGettingThere') }] : []),
    { id: 'offered-by', label: t('tabOfferedBy') },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: pkg.title,
    description: pkg.summary ?? pkg.description ?? undefined,
    url: absoluteUrl(`/packages/${slug}`),
    provider: {
      '@type': 'Organization',
      name: pkg.business.name,
      url: absoluteUrl(`/business/${pkg.business.slug}`),
    },
    ...(pkg.priceFrom !== null
      ? {
          offers: {
            '@type': 'Offer',
            price: pkg.priceFrom,
            priceCurrency: pkg.currency,
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
    ...(route.length
      ? {
          itinerary: {
            '@type': 'ItemList',
            itemListElement: route.map((d, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: { '@type': 'TouristDestination', name: d.name },
            })),
          },
        }
      : {}),
  };

  const sectionClass = 'scroll-mt-[calc(var(--header-h)+4rem)] border-t pt-8';

  return (
    <>
      <PageView locale={locale} packageId={pkg.id} />
      <RememberTour
        tour={{
          slug: pkg.slug,
          locale,
          title: pkg.title,
          price: price ? `${price} ${unit}` : null,
          days: pkg.durationDays,
          image: heroSrc,
          operator: pkg.business.name,
        }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Photograph and title. The title sits on the picture, as theirs does,
          over a scrim tall enough to keep it legible on a pale sky. */}
      <section className="relative isolate flex min-h-[min(52svh,28rem)] items-end overflow-hidden bg-surface-sunken">
        {heroSrc ? (
          <Image src={heroSrc} alt="" fill priority sizes="100vw" quality={70} className="-z-10 object-cover" />
        ) : (
          <MediaFallback icon="Route" label={null} className="absolute inset-0 -z-10" />
        )}
        <div className="overlay-scrim absolute inset-0 -z-10" />
        <div className="container-page w-full pb-6 pt-24 sm:pb-8">
          {pkg.isDemo && (
            <Badge variant="demo" className="mb-3 border-white/40 bg-black/30 text-white">
              {tCommon('demoData')}
            </Badge>
          )}
          <h1 className="max-w-3xl text-balance font-display text-3xl font-semibold leading-tight text-white sm:text-5xl">
            {pkg.title}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
            {pkg.durationDays && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden />
                {t('length', { days: pkg.durationDays, nights: pkg.durationNights ?? pkg.durationDays - 1 })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              {pkg.business.isVerified && <BadgeCheck className="size-4" aria-hidden />}
              {pkg.business.name}
            </span>
            {rated && (
              <span className="flex items-center gap-1">
                <Star className="size-4 fill-[var(--sun-400)] text-[var(--sun-400)]" aria-hidden />
                <span className="font-semibold tabular-nums">{pkg.business.ratingAvg.toFixed(1)}</span>
                <span className="text-white/75">({pkg.business.ratingCount})</span>
              </span>
            )}
          </p>
          {heroPlace && <p className="mt-2 text-xs text-white/70">{t('photoOf', { place: heroPlace })}</p>}
        </div>
      </section>

      <SectionTabs items={tabs} label={t('tabsLabel')} />

      <div className="container-page pt-4">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: 'Explore Tanzania', href: '/' },
            { label: tNav('tours'), href: '/packages' },
            { label: pkg.title },
          ]}
        />
      </div>

      <div className="container-page grid grid-cols-1 gap-10 pb-28 pt-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:pb-section">
        <div className="min-w-0 space-y-10">
          {/* ---- Overview ------------------------------------------------ */}
          <section id="overview" className="scroll-mt-[calc(var(--header-h)+4rem)] space-y-6">
            <h2 className="sr-only">{t('tabOverview')}</h2>
            {pkg.summary && <p className="text-lg leading-relaxed">{pkg.summary}</p>}
            {pkg.description && (
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{pkg.description}</p>
            )}

            {/* The route as a line of stops, start marked — the line a shopper
                reads to know whether "6 days" includes the Serengeti. */}
            {route.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('route')}</h3>
                <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
                  {pkg.startCity && (
                    <li className="flex items-center gap-2">
                      <span className="rounded-full bg-primary-subtle px-3 py-1 font-medium text-primary">
                        {pkg.startCity} <span className="font-normal opacity-75">({t('start')})</span>
                      </span>
                      <span aria-hidden className="h-px w-4 bg-border" />
                    </li>
                  )}
                  {route.map((d, i) => (
                    <li key={d.id} className="flex items-center gap-2">
                      <Link
                        href={{ pathname: '/destinations/[slug]', params: { slug: d.slug } }}
                        className="rounded-full border px-3 py-1 transition-colors hover:border-primary hover:text-primary"
                      >
                        {d.name}
                      </Link>
                      {i < route.length - 1 && <span aria-hidden className="h-px w-4 bg-border" />}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {features.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('features')}</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {features.map((f) => (
                    <li key={f.label} className="flex items-center gap-2.5 rounded-lg border bg-surface px-3 py-2.5 text-sm">
                      {f.yes ? (
                        <Check className="size-4 shrink-0 text-success" aria-hidden />
                      ) : (
                        <X className="size-4 shrink-0 text-destructive" aria-hidden />
                      )}
                      {f.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* ---- Day by day ---------------------------------------------- */}
          {(itinerary.days.length > 0 || itinerary.intro.length > 0) && (
            <section id="day-by-day" className={sectionClass}>
              <h2 className="font-display text-2xl font-semibold">{t('tabDays')}</h2>
              {itinerary.intro.map((p, i) => (
                <p key={i} className="mt-4 leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
              {itinerary.days.length > 0 && (
                <ol className="mt-6 space-y-0">
                  {itinerary.days.map((d, i) => (
                    <li key={`${d.label}-${i}`} className="relative flex gap-4 pb-7 last:pb-0">
                      {/* The timeline: a numbered marker on a line that stops at the last day. */}
                      <div className="flex flex-col items-center">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums">
                          {d.label}
                        </span>
                        {i < itinerary.days.length - 1 && <span aria-hidden className="mt-1 w-px flex-1 bg-border" />}
                      </div>
                      <div className="min-w-0 pt-1.5">
                        <h3 className="font-semibold">
                          {t('day', { label: d.label })}
                          {d.title && <span className="font-normal text-muted-foreground"> · {d.title}</span>}
                        </h3>
                        {d.body.map((p, j) => (
                          <p key={j} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {p}
                          </p>
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {/* ---- Rates --------------------------------------------------- */}
          {price && (
            <section id="rates" className={sectionClass}>
              <h2 className="font-display text-2xl font-semibold">{t('tabRates')}</h2>
              <p className="mt-4">
                <span className="text-sm text-muted-foreground">{tPkg('from')} </span>
                <span className="font-display text-3xl font-semibold tabular-nums">{price}</span>
                <span className="ml-1 text-sm text-muted-foreground">{unit}</span>
                {pkg.priceFrom !== null && (
                  <ConvertedPrice amount={pkg.priceFrom} currency={pkg.currency ?? 'USD'} locale={locale} />
                )}
              </p>
              <div className="mt-2">
                <CurrencyPicker label={tTours('showIn')} />
              </div>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">{t('ratesBody')}</p>
              {(pkg.parkFeesIncluded !== null || pkg.vehicle) && (
                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {pkg.parkFeesIncluded !== null && (
                    <span className="font-medium">
                      {pkg.parkFeesIncluded ? tTours('pageParkFeesIn') : tTours('pageParkFeesOut')}
                    </span>
                  )}
                  {pkg.vehicle && <span className="text-muted-foreground">{tTours('pageVehicle', { vehicle: pkg.vehicle })}</span>}
                </p>
              )}
              {pkg.rates.length > 0 && (
                <div className="mt-5 overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[22rem] text-left text-sm [&_td]:border-t [&_td]:px-3 [&_td]:py-2 [&_th]:bg-surface-muted [&_th]:px-3 [&_th]:py-2">
                    <caption className="sr-only">{tTours('pageRates')}</caption>
                    <thead>
                      <tr>
                        <th>{tTours('formSeason')}</th>
                        <th>{tTours('pageGroup')}</th>
                        <th>{tTours('formRatePrice')}</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {pkg.rates.map((r, i) => (
                        <tr key={i}>
                          <td>{tTours(`season_${r.season as 'all'}`)}</td>
                          <td>
                            {r.groupMax
                              ? r.groupMax === r.groupMin
                                ? tTours('pagePeople', { min: r.groupMin })
                                : tTours('pagePeopleRange', { min: r.groupMin, max: r.groupMax })
                              : tTours('pagePeopleUp', { min: r.groupMin })}
                          </td>
                          <td className="font-semibold">{formatPrice(r.price, pkg.currency ?? 'USD', locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-5">
                <h3 className="text-sm font-semibold">{tTours('pageDepartures')}</h3>
                {pkg.departures.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {pkg.departures.slice(0, 12).map((d) => (
                      <li key={d} className="rounded-pill border px-3 py-1 text-sm tabular-nums">
                        {new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${d}T12:00:00Z`))}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{tTours('pageOnRequest')}</p>
                )}
              </div>
              <Button asChild className="mt-5">
                <Link href={quoteHref}>{t('cta')}</Link>
              </Button>
            </section>
          )}

          {/* ---- Inclusions ---------------------------------------------- */}
          {pkg.inclusions.length > 0 && (
            <section id="inclusions" className={cn(sectionClass, 'grid gap-8 sm:grid-cols-2')}>
              <h2 className="sr-only">{t('tabInclusions')}</h2>
              {included.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold">{tPkg('included')}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {included.map((i) => (
                      <li key={i.id} className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                        <span>{i.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {excluded.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold">{tPkg('excluded')}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {excluded.map((i) => (
                      <li key={i.id} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                        <span>{i.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* ---- Getting there ------------------------------------------- */}
          {(pkg.startCity || route.length > 0) && (
            <section id="getting-there" className={sectionClass}>
              <h2 className="font-display text-2xl font-semibold">{t('tabGettingThere')}</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed">
                {pkg.startCity && (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {t('startsIn', { city: pkg.startCity })}
                  </li>
                )}
                {airport && (
                  <li className="flex items-start gap-2.5">
                    <Plane className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {t('airport', { airport })}
                  </li>
                )}
                {!pkg.startCity && (
                  <li className="flex items-start gap-2.5 text-muted-foreground">
                    <MessageCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {t('askPickup', { operator: pkg.business.name })}
                  </li>
                )}
              </ul>
              {route.length > 0 && (
                <>
                  <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('placesOnRoute')}
                  </h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {route.map((d) => (
                      <li key={d.id}>
                        <Link
                          href={{ pathname: '/destinations/[slug]', params: { slug: d.slug } }}
                          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:border-primary hover:text-primary"
                        >
                          {d.name}
                          <span aria-hidden>→</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {/* ---- Offered by ---------------------------------------------- */}
          <section id="offered-by" className={sectionClass}>
            <h2 className="font-display text-2xl font-semibold">{t('tabOfferedBy')}</h2>
            <div className="mt-4 rounded-2xl border bg-surface p-5">
              <p className="flex items-center gap-2 text-lg font-semibold">
                {pkg.business.isVerified && <BadgeCheck className="size-5 shrink-0 text-success" aria-hidden />}
                {pkg.business.name}
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                {rated && (
                  <li className="flex items-center gap-1">
                    <Star className="size-4 fill-[var(--sun-400)] text-[var(--sun-400)]" aria-hidden />
                    <span className="font-semibold text-foreground tabular-nums">
                      {pkg.business.ratingAvg.toFixed(1)}
                    </span>
                    {t('reviews', { count: pkg.business.ratingCount })}
                  </li>
                )}
                {hours && (
                  <li className="flex items-center gap-1.5">
                    <Clock className="size-4" aria-hidden />
                    {t('replies', { hours })}
                  </li>
                )}
              </ul>
              <Button asChild variant="outline" size="md" className="mt-4">
                <Link href={{ pathname: '/business/[slug]', params: { slug: pkg.business.slug } }}>
                  {t('viewProfile')}
                </Link>
              </Button>
            </div>

            {moreByOperator.length > 0 && (
              <>
                <h3 className="mt-8 text-lg font-semibold">{t('moreTours', { operator: pkg.business.name })}</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {moreByOperator.slice(0, 2).map((p) => (
                    <PackageCard key={p.id} pkg={p} locale={locale} />
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        {/* ---- The quote block: price, one button, the reassurances ------- */}
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h)+4.5rem)] rounded-2xl border bg-card p-6 shadow-[var(--elev-sm)]">
            {price ? (
              <p>
                <span className="text-sm text-muted-foreground">{tPkg('from')} </span>
                <span className="font-display text-3xl font-semibold tabular-nums">{price}</span>
                <span className="ml-1 text-sm text-muted-foreground">{unit}</span>
              </p>
            ) : (
              <p className="font-semibold">{t('priceOnRequest')}</p>
            )}
            <Button asChild size="lg" className="mt-5 w-full">
              <Link href={quoteHref}>{t('cta')}</Link>
            </Button>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                {t('reassureDirect', { operator: pkg.business.name })}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                {t('reassureFree')}
              </li>
            </ul>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="mt-4 flex items-center gap-2 border-t pt-4 text-sm font-medium text-primary hover:underline"
              >
                <MessageCircle className="size-4" aria-hidden />
                {t('whatsapp', { operator: pkg.business.name })}
              </a>
            )}
            {pkg.isCustomizable && (
              <p className="mt-4 flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
                <Settings2 className="size-3.5" aria-hidden />
                {t('customizableNote')}
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* The other tours this reader has been weighing up, this one left out. */}
      <div className="container-page">
        <RecentlyViewedTours exclude={pkg.slug} className="mb-10" />
      </div>

      {related.length > 0 && (
        <section className="container-page pb-28 lg:pb-section">
          <h2 className="font-display text-2xl font-semibold">{t('related')}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <PackageCard key={p.id} pkg={p} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* Phones: the price and the button stay on screen. The bottom menu
          hides itself while this bar exists (data-mobile-action-bar). */}
      <div
        data-mobile-action-bar
        className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t bg-surface px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {price ? (
              <p className="truncate">
                <span className="font-display text-lg font-semibold tabular-nums">{price}</span>
                <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
              </p>
            ) : (
              <p className="truncate text-sm font-semibold">{t('priceOnRequest')}</p>
            )}
            <p className="truncate text-xs text-muted-foreground">{t('reassureShort')}</p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href={quoteHref}>{t('cta')}</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
