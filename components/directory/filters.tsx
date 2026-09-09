import { getTranslations } from 'next-intl/server';
import { SlidersHorizontal } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { CategorySummary, DestinationSummary } from '@/lib/queries/taxonomy';
import type { CountryWithBusinesses } from '@/lib/queries/countries';
import type { RegionGroup } from '@/lib/queries/regions';
import { countryName } from '@/lib/country-names';
import type { Locale } from '@/i18n/routing';

/**
 * Directory filters as a row, not a column.
 *
 * This was a 288px sidebar standing 715px tall — seven fields, each a label on
 * its own line above a 44px control. No amount of tightening fixes that shape:
 * a stack of seven is tall because it is a stack of seven, and it spent a
 * quarter of the page's width for the whole of the scroll while putting its own
 * submit button below the fold.
 *
 * One of the seven was never needed. The band directly above carries a
 * DiscoverySearch holding `q`, `category` and `destination` — so the sidebar's
 * search box asked, 200px lower, for the thing the page had just asked for in a
 * box four times the size. It is gone, and the query it holds is carried
 * through here as a hidden field so refining by country does not discard what
 * somebody typed. Category and destination stay, because only these two carry
 * the listing counts that say whether a facet is worth pressing.
 *
 * What is left sticks under the header, so the filters are reachable at any
 * scroll depth while occupying ~110px once rather than 715px beside
 * everything — and the listings get the full width, which is what a comparison
 * surface wants.
 *
 * Still a plain GET form, which is not incidental. Every filter combination has
 * to stay a shareable, crawlable, bookmarkable URL, because those URLs are the
 * product's search surface — and it has to work before hydration.
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

  /**
   * One width for every control, set on the WRAPPER rather than the select.
   *
   * Select renders its `<select>` inside a `relative` div that carries the
   * chevron, so a width passed through `className` lands on the select while
   * the div still sizes itself to content. Left that way the six came out
   * between 125px and 316px — each as wide as its own longest option, so
   * "Mahale Mountains National Park (3)" set the width of the destination
   * field — and they did not shrink on a phone either.
   *
   * Two per row on a phone, a fixed 10.5rem from `sm` up. `h-11` stays
   * throughout: 44px is the touch target, and this is the filter UI on mobile
   * as well as desktop.
   */
  const cell = 'w-[calc(50%-0.25rem)] shrink-0 sm:w-[10.5rem]';

  return (
    <form
      method="get"
      // Sticky under the header. This row is the only chrome between the search
      // band and the listings, so it can afford to stay put — and staying put
      // is what lets it be this small without becoming hard to reach.
      className="sticky top-[var(--header-h)] z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8"
      aria-label={t('filters')}
    >
      {/* The typed query lives in the search band above. Carried through as a
          hidden field so changing a facet down here does not silently throw it
          away, which is the commonest way a filter bar loses somebody's work. */}
      {current.q && <input type="hidden" name="q" value={current.q} />}

      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden shrink-0 items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground xl:flex">
          <SlidersHorizontal className="size-3.5" aria-hidden />
          {t('filters')}
        </span>

        {/* Every label here is screen-reader only. Each select's first option
            already names its own field — "All countries", "Any rating" — so a
            visible label above it repeated the word and cost a line per field.
            The element stays for the association; only its pixels go. */}
        <div className={cell}>
          <label htmlFor="category" className="sr-only">
            {t('category')}
          </label>
          <Select id="category" name="category" defaultValue={current.category ?? ''}>
            <option value="">{t('anyCategory')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name} ({facets.byCategory.get(c.id) ?? 0})
              </option>
            ))}
          </Select>
        </div>

        {countries.length > 1 && (
          <div className={cell}>
            <label htmlFor="country" className="sr-only">
              {t('country')}
            </label>
            <Select id="country" name="country" defaultValue={current.country ?? ''}>
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
          <div className={cell}>
            <label htmlFor="region" className="sr-only">
              {t('region')}
            </label>
            <Select id="region" name="region" defaultValue={current.region ?? ''}>
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

        <div className={cell}>
          <label htmlFor="destination" className="sr-only">
            {t('destination')}
          </label>
          <Select id="destination" name="destination" defaultValue={current.destination ?? ''}>
            <option value="">{t('anyDestination')}</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.slug}>
                {d.name} ({facets.byDestination.get(d.id) ?? 0})
              </option>
            ))}
          </Select>
        </div>

        <div className={cell}>
          <label htmlFor="rating" className="sr-only">
            {t('rating')}
          </label>
          <Select id="rating" name="rating" defaultValue={current.rating ?? ''}>
            <option value="">{t('anyRating')}</option>
            {[4.5, 4, 3.5, 3].map((r) => (
              <option key={r} value={r}>
                {t('ratingPlus', { rating: r })}
              </option>
            ))}
          </Select>
        </div>

        <div className={cell}>
          <label htmlFor="sort" className="sr-only">
            {t('sort')}
          </label>
          <Select id="sort" name="sort" defaultValue={current.sort ?? 'recommended'}>
            <option value="recommended">{t('sortRecommended')}</option>
            <option value="rating">{t('sortRating')}</option>
            <option value="name">{t('sortName')}</option>
          </Select>
        </div>

        <label className="flex h-11 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap text-sm">
          <input
            name="verified"
            type="checkbox"
            value="1"
            defaultChecked={current.verified === '1'}
            className="size-4 accent-[var(--primary)]"
          />
          {t('verifiedOnly')}
        </label>

        <Button type="submit" className="shrink-0">
          {t('applyFilters')}
        </Button>

        {hasFilters && (
          <Button asChild variant="ghost" className="shrink-0">
            <Link href="/directory">{t('clearFilters')}</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
