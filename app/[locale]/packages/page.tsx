import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SearchX } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { getDestinations } from '@/lib/queries/taxonomy';
import { searchPackages, type TourFilters } from '@/lib/queries/packages';
import { PackageCard } from '@/components/cards/package-card';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { PageHero } from '@/components/layout/page-hero';
import { Pagination } from '@/components/directory/pagination';
import { RecentlyViewedTours } from '@/components/tours/recently-viewed';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { TRIP_ACTIVITIES, TRIP_INTENTS, isTripActivity, isTripIntent } from '@/lib/taxonomy/trip';
import { countryName } from '@/lib/country-names';
import { TOUR_COUNTRIES } from '@/components/home/tour-finder-options';

/**
 * The tour search.
 *
 * Owner's call, 14 November 2026: take the direction SafariBookings has
 * taken. What that site sells is tours — a traveller picks a country and
 * gets a list of priced itineraries, each from a named and rated operator.
 * This site had the itineraries and no list: /packages/[slug] existed and
 * /packages answered 404, so a tour could be found from its operator's page
 * and from nowhere a traveller actually starts.
 *
 * Three things taken from them, and one deliberately not.
 *
 * **The count is the headline.** "Compare 5,912 tours" tells a visitor what
 * the page is and that it is worth their time in four words. Ours says the
 * real number, which today is small, because the alternative is a headline
 * that the first scroll disproves.
 *
 * **Filters are the questions a tour card answers**: where, how long, how
 * much, how comfortable, whose vehicle. Each is a plain <select> in a GET
 * form, so the page works before JavaScript, the URL is the search, and a
 * filtered list can be linked to and indexed.
 *
 * **How the list is ordered is said on the page.** Theirs reads "Rankings are
 * based on performance, relevance and payment". Ours says what ours is based
 * on, in one line under the count.
 *
 * **Not taken: their card.** Theirs is a full-bleed photograph with the title
 * set on it. Nine in ten cover images on this site are Google Places links
 * that return 403 (docs/competitor-teardown.md §2b), so a card that depends
 * on its photograph would mostly show a grey box with a title on it. The
 * existing PackageCard leads with the facts and treats the photograph as a
 * bonus, which is the right way round for the media this site has.
 */

const PER_PAGE = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Length bands rather than two free numbers: nobody searches for 6–9 days. */
const LENGTHS = {
  '1-3': { minDays: 1, maxDays: 3 },
  '4-6': { minDays: 4, maxDays: 6 },
  '7-10': { minDays: 7, maxDays: 10 },
  '11+': { minDays: 11, maxDays: undefined },
} as const;
const PRICES = [1000, 2000, 3500, 5000] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tours' });
  const { total } = await searchPackages(locale, { perPage: 1 });
  return {
    title: t('metaTitle', { count: total }),
    description: t('metaDescription'),
    alternates: localeAlternates('/packages', locale),
  };
}

export default async function ToursPage({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const [t, tNav, tIntent, tActivity, destinations] = await Promise.all([
    getTranslations('tours'),
    getTranslations('nav'),
    getTranslations('business.intents'),
    getTranslations('business.activities'),
    getDestinations(locale),
  ]);

  // Every value is checked against what the form can send. A hand-typed
  // ?comfort=anything is dropped rather than passed to the query.
  const where = first(sp.where);
  const destination = destinations.find((d) => d.slug === where);
  const length = first(sp.length) as keyof typeof LENGTHS | undefined;
  const band = length && length in LENGTHS ? LENGTHS[length] : undefined;
  const priceRaw = Number(first(sp.price));
  const maxPrice = (PRICES as readonly number[]).includes(priceRaw) ? priceRaw : undefined;
  const comfortRaw = first(sp.comfort);
  const comfort =
    comfortRaw === 'budget' || comfortRaw === 'midrange' || comfortRaw === 'luxury' ? comfortRaw : undefined;
  const styleRaw = first(sp.style);
  const style = styleRaw === 'private' || styleRaw === 'shared' ? styleRaw : undefined;
  const sortRaw = first(sp.sort);
  const sort = sortRaw === 'price' || sortRaw === 'duration' ? sortRaw : 'recommended';
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const countryRaw = first(sp.country)?.toUpperCase();
  const country = (TOUR_COUNTRIES as readonly string[]).includes(countryRaw ?? '') ? countryRaw : undefined;
  const intentRaw = first(sp.intent);
  const intent = isTripIntent(intentRaw) ? intentRaw : undefined;
  const activityRaw = first(sp.activity);
  const activity = isTripActivity(activityRaw) ? activityRaw : undefined;

  const filters: TourFilters = {
    destinationId: destination?.id,
    countryCode: country,
    intent,
    activity,
    minDays: band?.minDays,
    maxDays: band?.maxDays,
    maxPrice,
    comfort,
    style,
    sort,
    page,
    perPage: PER_PAGE,
  };
  const { items, total } = await searchPackages(locale, filters);
  const filtered = Boolean(destination || country || intent || activity || band || maxPrice || comfort || style);

  // The current search as a query object, for pagination links.
  const query: Record<string, string> = {};
  if (destination) query.where = destination.slug;
  if (country) query.country = country;
  if (intent) query.intent = intent;
  if (activity) query.activity = activity;
  if (band && length) query.length = length;
  if (maxPrice) query.price = String(maxPrice);
  if (comfort) query.comfort = comfort;
  if (style) query.style = style;
  if (sort !== 'recommended') query.sort = sort;

  const money = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <>
      <PageHero
        breadcrumbs={
          <Breadcrumbs
            locale={locale}
            items={[{ label: 'Explore Tanzania', href: '/' }, { label: tNav('tours') }]}
          />
        }
        title={t('title', { count: total })}
        lead={t('lead')}
      />

      <div className="container-page pb-section pt-5">
        <RecentlyViewedTours className="mb-6" />
        {/* method=get: the search is the URL. No client state, no hydration. */}
        <form
          method="get"
          className="grid grid-cols-2 gap-3 rounded-2xl border bg-surface p-4 shadow-[var(--elev-xs)] md:grid-cols-3 lg:grid-cols-5"
        >
          <div className="space-y-1.5">
            <Label htmlFor="country">{t('countryLabel')}</Label>
            <Select id="country" name="country" defaultValue={country ?? ''}>
              <option value="">{t('anyCountry')}</option>
              {TOUR_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {countryName(c, locale)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="intent">{t('tripTypeLabel')}</Label>
            <Select id="intent" name="intent" defaultValue={intent ?? ''}>
              <option value="">{t('anyTripType')}</option>
              {TRIP_INTENTS.map((i) => (
                <option key={i} value={i}>
                  {tIntent(i)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="activity">{t('activityLabel')}</Label>
            <Select id="activity" name="activity" defaultValue={activity ?? ''}>
              <option value="">{t('anyActivity')}</option>
              {TRIP_ACTIVITIES.map((a) => (
                <option key={a} value={a}>
                  {tActivity(a)}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5 md:col-span-1">
            <Label htmlFor="where">{t('whereLabel')}</Label>
            <Select id="where" name="where" defaultValue={destination?.slug ?? ''}>
              <option value="">{t('anywhere')}</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="length">{t('lengthLabel')}</Label>
            <Select id="length" name="length" defaultValue={band && length ? length : ''}>
              <option value="">{t('anyLength')}</option>
              <option value="1-3">{t('days', { range: '1–3' })}</option>
              <option value="4-6">{t('days', { range: '4–6' })}</option>
              <option value="7-10">{t('days', { range: '7–10' })}</option>
              <option value="11+">{t('days', { range: '11+' })}</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price">{t('priceLabel')}</Label>
            <Select id="price" name="price" defaultValue={maxPrice ? String(maxPrice) : ''}>
              <option value="">{t('anyPrice')}</option>
              {PRICES.map((p) => (
                <option key={p} value={p}>
                  {t('upTo', { price: money(p) })}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="comfort">{t('comfortLabel')}</Label>
            <Select id="comfort" name="comfort" defaultValue={comfort ?? ''}>
              <option value="">{t('anyComfort')}</option>
              <option value="budget">{t('comfort_budget')}</option>
              <option value="midrange">{t('comfort_midrange')}</option>
              <option value="luxury">{t('comfort_luxury')}</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="style">{t('styleLabel')}</Label>
            <Select id="style" name="style" defaultValue={style ?? ''}>
              <option value="">{t('anyStyle')}</option>
              <option value="private">{t('style_private')}</option>
              <option value="shared">{t('style_shared')}</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sort">{t('sortLabel')}</Label>
            <Select id="sort" name="sort" defaultValue={sort}>
              <option value="recommended">{t('sort_recommended')}</option>
              <option value="price">{t('sort_price')}</option>
              <option value="duration">{t('sort_duration')}</option>
            </Select>
          </div>
          <div className="col-span-2 flex items-center gap-3 md:col-span-3 lg:col-span-5">
            <Button type="submit" size="md" className="max-sm:flex-1">
              {t('show')}
            </Button>
            {filtered && (
              <Link href="/packages" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
                {t('clear')}
              </Link>
            )}
          </div>
        </form>

        <p className="mt-5 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{t('results', { count: total })}</span>
          {' · '}
          {/* Said in full, on the page, because it is the question every
              ordered list raises and most never answer. */}
          {t(`ranking_${sort}`)}
        </p>

        {items.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed p-10 text-center">
            <SearchX className="size-6 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 font-display text-xl font-semibold">{t('emptyTitle')}</h2>
            {/* A search with no match is not the end of the errand: the quote
                form reaches operators whose tours are not written up here. */}
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{t('emptyBody')}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {filtered && (
                <Button asChild variant="outline">
                  <Link href="/packages">{t('clear')}</Link>
                </Button>
              )}
              <Button asChild>
                <Link href="/request-quote">{t('emptyCta')}</Link>
              </Button>
            </div>
          </div>
        )}

        <div className="mt-8">
          <Pagination
            page={page}
            totalPages={Math.ceil(total / PER_PAGE)}
            total={total}
            perPage={PER_PAGE}
            hrefFor={(p) => ({ pathname: '/packages', query: p > 1 ? { ...query, page: String(p) } : query })}
          />
        </div>

        {/* Operators are the supply. The page that shows how few tours there
            are is the page to ask for more on. */}
        <aside className="mt-10 rounded-2xl border bg-surface-muted p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="font-display text-lg font-semibold">{t('operatorTitle')}</h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">{t('operatorBody')}</p>
          </div>
          <Button asChild variant="outline" className="mt-4 shrink-0 sm:mt-0">
            <Link href="/dashboard/packages">{t('operatorCta')}</Link>
          </Button>
        </aside>
      </div>
    </>
  );
}
