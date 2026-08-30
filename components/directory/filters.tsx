import { getTranslations } from 'next-intl/server';
import { Search, SlidersHorizontal } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CategorySummary, DestinationSummary } from '@/lib/queries/taxonomy';
import type { CountryWithBusinesses } from '@/lib/queries/countries';

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
  facets,
  current,
}: {
  categories: CategorySummary[];
  destinations: DestinationSummary[];
  countries: CountryWithBusinesses[];
  /** How many live listings sit behind each facet, so a filter shows its weight. */
  facets: { byCategory: Map<string, number>; byDestination: Map<string, number> };
  current: {
    q?: string;
    country?: string;
    category?: string;
    destination?: string;
    rating?: string;
    verified?: string;
    sort?: string;
  };
}) {
  const t = await getTranslations('directory');

  const selectClass =
    'h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30';

  const hasFilters = Boolean(
    current.q ||
      current.country ||
      current.category ||
      current.destination ||
      current.rating ||
      current.verified,
  );

  return (
    <form
      method="get"
      className="rounded-2xl border bg-card p-5"
      aria-label={t('filters')}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
        {t('filters')}
      </div>

      <div className="mt-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="q">{t('searchLabel')}</Label>
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

        <div className="space-y-2">
          <Label htmlFor="category">{t('category')}</Label>
          <select
            id="category"
            name="category"
            defaultValue={current.category ?? ''}
            className={selectClass}
          >
            <option value="">{t('anyCategory')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name} ({facets.byCategory.get(c.id) ?? 0})
              </option>
            ))}
          </select>
        </div>

        {countries.length > 1 && (
          <div className="space-y-2">
            <Label htmlFor="country">{t('country')}</Label>
            <select
              id="country"
              name="country"
              defaultValue={current.country ?? ''}
              className={selectClass}
            >
              <option value="">{t('anyCountry')}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.businessCount})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="destination">{t('destination')}</Label>
          <select
            id="destination"
            name="destination"
            defaultValue={current.destination ?? ''}
            className={selectClass}
          >
            <option value="">{t('anyDestination')}</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.slug}>
                {d.name} ({facets.byDestination.get(d.id) ?? 0})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rating">{t('rating')}</Label>
          <select
            id="rating"
            name="rating"
            defaultValue={current.rating ?? ''}
            className={selectClass}
          >
            <option value="">{t('anyRating')}</option>
            {[4.5, 4, 3.5, 3].map((r) => (
              <option key={r} value={r}>
                {t('ratingPlus', { rating: r })}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sort">{t('sort')}</Label>
          <select
            id="sort"
            name="sort"
            defaultValue={current.sort ?? 'recommended'}
            className={selectClass}
          >
            <option value="recommended">{t('sortRecommended')}</option>
            <option value="rating">{t('sortRating')}</option>
            <option value="name">{t('sortName')}</option>
          </select>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-3.5">
          <input
            id="verified"
            name="verified"
            type="checkbox"
            value="1"
            defaultChecked={current.verified === '1'}
            className="mt-0.5 size-4 accent-[var(--primary)]"
          />
          <Label htmlFor="verified" className="font-normal">
            {t('verifiedOnly')}
          </Label>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
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
