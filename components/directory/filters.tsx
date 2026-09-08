import { getTranslations } from 'next-intl/server';
import { Search, SlidersHorizontal } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { CategorySummary, DestinationSummary } from '@/lib/queries/taxonomy';
import type { CountryWithBusinesses } from '@/lib/queries/countries';
import type { RegionGroup } from '@/lib/queries/regions';
import { countryName } from '@/lib/country-names';
import type { Locale } from '@/i18n/routing';

/**
 * Directory filters as a plain GET form.
 *
 * Deliberately not a client component with live-updating state: submitting to
 * the same URL keeps every filter combination a shareable, crawlable, bookmarkable
 * URL — which matters when those URLs are the product's search surface — and it
 * works with JavaScript disabled or still loading.
 */
export async function DirectoryFilters({
  categories,
  destinations,
  countries,
  regions,
  facets,
  current,
  locale,
}: {
  categories: CategorySummary[];
  destinations: DestinationSummary[];
  countries: CountryWithBusinesses[];
  regions: RegionGroup[];
  /** How many live listings sit behind each facet, so a filter shows its weight. */
  facets: {
    byCategory: Map<string, number>;
    byDestination: Map<string, number>;
    byRegion: Map<string, number>;
  };
  locale: Locale;
  current: {
    q?: string;
    country?: string;
    region?: string;
    category?: string;
    destination?: string;
    rating?: string;
    verified?: string;
    sort?: string;
  };
}) {
  const t = await getTranslations('directory');

  // Busiest first inside each country: a reader scanning for somewhere to start
  // is better served by Arusha at the top than by Arusha buried alphabetically
  // between Dodoma and Dar es Salaam.
  const regionsWithListings = regions
    .map((group) => ({
      ...group,
      regions: group.regions
        .filter((r) => (facets.byRegion.get(r.id) ?? 0) > 0)
        .sort(
          (a, b) =>
            (facets.byRegion.get(b.id) ?? 0) - (facets.byRegion.get(a.id) ?? 0) ||
            a.name.localeCompare(b.name),
        ),
    }))
    .filter((group) => group.regions.length > 0);

  const hasFilters = Boolean(
    current.q ||
      current.country ||
      current.region ||
      current.category ||
      current.destination ||
      current.rating ||
      current.verified,
  );

  return (
    <form
      method="get"
      className="rounded-2xl border bg-card p-4"
      aria-label={t('filters')}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
        {t('filters')}
      </div>

      {/* Seven fields at 21px of label plus 8px of gap plus a 44px control,
          with 16px between them, came to 770px — so on a 900px laptop the
          "Show results" button was below the fold, on the one panel where the
          button is the entire point. Small tracked capitals and tighter gaps
          take ~130px out of that without shrinking a single control: the
          controls stay at h-11 because this same form is the full-width filter
          UI on a phone, and 44px is the touch target. */}
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="q" size="sm">{t('searchLabel')}</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="q"
              name="q"
              type="search"
              defaultValue={current.q ?? ''}
              placeholder={t('searchPlaceholder')}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category" size="sm">{t('category')}</Label>
          <Select
            id="category"
            name="category"
            defaultValue={current.category ?? ''}
          >
            <option value="">{t('anyCategory')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name} ({facets.byCategory.get(c.id) ?? 0})
              </option>
            ))}
          </Select>
        </div>

        {countries.length > 1 && (
          <div className="space-y-1.5">
            <Label htmlFor="country" size="sm">{t('country')}</Label>
            <Select
              id="country"
              name="country"
              defaultValue={current.country ?? ''}
            >
              <option value="">{t('anyCountry')}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {countryName(c.code, locale, c.name)} ({c.businessCount})
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Region, under its country.
            
            Grouped rather than flat because 87 options in one run is unreadable,
            and because 'Western' is a region of Uganda and a province of Rwanda —
            the country heading is what makes the option unambiguous to read. The
            slug is unique on its own, so the server needs no country beside it
            and picking a region without one works.
            
            Regions holding nothing are left out. An option that leads to an
            empty page is a dead end presented as a choice, and 65 of the 87 hold
            no listings today. */}
        {regionsWithListings.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="region" size="sm">{t('region')}</Label>
            <Select
              id="region"
              name="region"
              defaultValue={current.region ?? ''}
            >
              <option value="">{t('anyRegion')}</option>
              {regionsWithListings.map((group) => (
                <optgroup
                  key={group.countryCode}
                  label={countryName(group.countryCode, locale, group.countryName)}
                >
                  {group.regions.map((r) => (
                    <option key={r.id} value={r.slug}>
                      {r.name} ({facets.byRegion.get(r.id) ?? 0})
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="destination" size="sm">{t('destination')}</Label>
          <Select
            id="destination"
            name="destination"
            defaultValue={current.destination ?? ''}
          >
            <option value="">{t('anyDestination')}</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.slug}>
                {d.name} ({facets.byDestination.get(d.id) ?? 0})
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rating" size="sm">{t('rating')}</Label>
          <Select
            id="rating"
            name="rating"
            defaultValue={current.rating ?? ''}
          >
            <option value="">{t('anyRating')}</option>
            {[4.5, 4, 3.5, 3].map((r) => (
              <option key={r} value={r}>
                {t('ratingPlus', { rating: r })}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sort" size="sm">{t('sort')}</Label>
          <Select
            id="sort"
            name="sort"
            defaultValue={current.sort ?? 'recommended'}
          >
            <option value="recommended">{t('sortRecommended')}</option>
            <option value="rating">{t('sortRating')}</option>
            <option value="name">{t('sortName')}</option>
          </Select>
        </div>

        {/* No box. A 1px border and 14px of padding around a checkbox and two
            words made it look like a field in its own right, which it is not —
            it is one more filter, and it reads as one on the same rhythm as
            the rest. */}
        <div className="flex items-center gap-2.5 pt-1">
          <input
            id="verified"
            name="verified"
            type="checkbox"
            value="1"
            defaultChecked={current.verified === '1'}
            className="size-4 accent-[var(--primary)]"
          />
          <Label htmlFor="verified" className="font-normal">
            {t('verifiedOnly')}
          </Label>
        </div>
      </div>

      {/* Pinned to the bottom of the sticky sidebar. Height matters less than
          reach: a filter panel taller than the viewport hides its own submit,
          and no amount of tightening fixes that on a short screen. */}
      <div className="sticky bottom-0 mt-4 flex flex-wrap gap-2 bg-card pt-3">
        <Button type="submit" className="flex-1">
          {t('applyFilters')}
        </Button>
        {hasFilters && (
          <Button asChild variant="ghost" size="default">
            <Link href="/directory">{t('clearFilters')}</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
