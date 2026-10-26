'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, SlidersHorizontal, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Select } from '@/components/ui/select';
import { Checkbox, ChoiceRow } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * FilterBar — design.md §6.7.
 *
 * Three rules from the spec drive the whole shape of this file.
 *
 * **"Filters auto-apply (debounced 300 ms) and update the URL query string.
 * Remove 'Show results'."** A submit button on a filter bar is a second step
 * between deciding and seeing, and on the old sidebar it sat below the fold —
 * so the commonest way to use the filters was to change one and then wonder why
 * nothing happened. Changing a control now *is* the action.
 *
 * **The URL stays the state.** Every combination has to remain shareable,
 * crawlable and bookmarkable, because those URLs are this product's search
 * surface. So this pushes to the router rather than holding state locally, and
 * the page re-renders from the query string exactly as it does on a cold load.
 *
 * **It still works without JavaScript.** The controls live in a real
 * `<form method="get">`, and the submit button is present in the markup and
 * hidden once this component has mounted. A visitor on a slow connection in
 * Arusha gets a working filter before hydration; a visitor with JavaScript
 * never sees the button.
 *
 * §6.7 also moves the keyword box in here as the first control. It used to be
 * a three-field hero-style search band above the results — 200px of page
 * asking for `q`, `category` and `destination`, directly above a filter row
 * asking for category and destination again. §7.2.4 deletes that band; the
 * header's search icon covers keyword search from anywhere else.
 */

export type FilterOption = { value: string; label: string; count?: number };

export type FilterBarProps = {
  categories: FilterOption[];
  destinations: FilterOption[];
  regions: { group: string; options: FilterOption[] }[];
  /** §6.7 sort options, already localised by the server. */
  sorts: FilterOption[];
  ratings: FilterOption[];
  /** False while nothing has been reviewed — the rating filter then hides. */
  anyRated: boolean;
  /** Total matching the current query, for the mobile sheet's footer. */
  total: number;
  current: {
    q?: string;
    region?: string;
    category?: string;
    destination?: string;
    rating?: string;
    verified?: string;
    sort?: string;
    anywhere?: string;
  };
};

/** §6.7 "Filters auto-apply (debounced 300 ms)". */
const DEBOUNCE_MS = 300;

export function FilterBar({
  categories,
  destinations,
  regions,
  sorts,
  ratings,
  anyRated,
  total,
  current,
}: FilterBarProps) {
  const t = useTranslations('directory');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // "Has this hydrated yet?" asked the way React sanctions: a store whose
  // server snapshot is false and whose client snapshot is true. The familiar
  // `useState(false)` + `useEffect(() => setState(true))` does the same job and
  // is a cascading render the compiler lint rejects — and this says what it
  // means, which is that the server and the client genuinely disagree here.
  const hydrated = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [text, setText] = React.useState(current.q ?? '');
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = React.useCallback(
    (changes: Record<string, string | null>, { replace = true } = {}) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      // Any change to a filter sends you back to page 1. Page 4 of the old
      // result set is a different, usually empty, page of the new one.
      next.delete('page');
      const query = next.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      // `replace` so twenty filter changes do not become twenty back-button
      // steps between a visitor and the page they came from. `scroll: false`
      // because the results are already in view and jumping to the top is the
      // behaviour this directory was reported for.
      router[replace ? 'replace' : 'push'](url, { scroll: false });
    },
    [params, pathname, router],
  );

  // Typing is debounced; everything else applies at once, because a select and
  // a checkbox produce one deliberate change rather than a stream of them.
  function onText(value: string) {
    setText(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ q: value || null }), DEBOUNCE_MS);
  }

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const activeCount = [
    current.region,
    current.category,
    current.destination,
    current.rating,
    current.verified,
    current.anywhere,
  ].filter(Boolean).length;

  const hasAny = activeCount > 0 || Boolean(current.q);

  function clearAll() {
    setText('');
    router.replace(pathname, { scroll: false });
  }

  const controls = (
    <>
      <Field label={t('searchByName')} htmlFor="f-q" className="sm:w-56">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="f-q"
            name="q"
            type="search"
            value={text}
            onChange={(e) => onText(e.target.value)}
            placeholder={t('searchByNamePlaceholder')}
            className="h-12 w-full rounded-sm border-control bg-surface pl-9 pr-3 text-base outline-none focus-visible:border-primary"
          />
        </div>
      </Field>

      <Field label={t('category')} htmlFor="f-category">
        <Select
          id="f-category"
          name="category"
          value={current.category ?? ''}
          onChange={(e) => apply({ category: e.target.value || null })}
        >
          <option value="">{t('anyCategory')}</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
              {c.count !== undefined ? ` (${c.count})` : ''}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t('destination')} htmlFor="f-destination">
        <Select
          id="f-destination"
          name="destination"
          value={current.destination ?? ''}
          onChange={(e) => apply({ destination: e.target.value || null })}
        >
          <option value="">{t('anyDestination')}</option>
          {destinations.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
              {d.count !== undefined ? ` (${d.count})` : ''}
            </option>
          ))}
        </Select>
      </Field>

      {regions.length > 0 && (
        <Field label={t('region')} htmlFor="f-region">
          <Select
            id="f-region"
            name="region"
            value={current.region ?? ''}
            onChange={(e) => apply({ region: e.target.value || null })}
          >
            <option value="">{t('anyRegion')}</option>
            {regions.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                    {r.count !== undefined ? ` (${r.count})` : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
      )}

      {/* §6.4: the rating filter hides entirely while nothing is rated. A
          "4 stars and up" control over a database with one review returns
          nothing and reads as a broken filter rather than an empty result. */}
      {anyRated && (
        <Field label={t('rating')} htmlFor="f-rating">
          <Select
            id="f-rating"
            name="rating"
            value={current.rating ?? ''}
            onChange={(e) => apply({ rating: e.target.value || null })}
          >
            <option value="">{t('anyRating')}</option>
            {ratings.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label={t('sort')} htmlFor="f-sort">
        <Select
          id="f-sort"
          name="sort"
          value={current.sort ?? ''}
          onChange={(e) => apply({ sort: e.target.value || null })}
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );

  const switches = (
    <>
      <ChoiceRow id="f-verified" label={t('verifiedOnly')}>
        <Checkbox
          id="f-verified"
          name="verified"
          value="1"
          checked={current.verified === '1'}
          onChange={(e) => apply({ verified: e.target.checked ? '1' : null })}
        />
      </ChoiceRow>

      {/* §6.7 / §9.3: Tanzania is the default and the only country shown. The
          other three stay one switch away and keep their URLs — the country
          select that used to sit in this bar made a four-country directory
          look like the product, when Tanzania is. */}
      <ChoiceRow id="f-anywhere" label={t('includeNeighbours')} hint={t('includeNeighboursHint')}>
        <Checkbox
          id="f-anywhere"
          name="anywhere"
          value="1"
          checked={current.anywhere === '1'}
          onChange={(e) => apply({ anywhere: e.target.checked ? '1' : null })}
        />
      </ChoiceRow>
    </>
  );

  return (
    <form
      method="get"
      aria-label={t('filters')}
      // Sticky under the header from sm up, where this is one row.
      className="z-[var(--z-sticky)] -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur-sm sm:sticky sm:top-[var(--header-h)] sm:-mx-8 sm:px-8"
    >
      {/* Desktop: the bar itself. */}
      <div className="hidden flex-wrap items-end gap-3 sm:flex">
        {controls}
        <div className="flex flex-wrap items-center gap-x-5">{switches}</div>
        {hasAny && (
          <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
            {t('clearAll')}
          </Button>
        )}
        {/* Present for a visitor without JavaScript, gone the moment this
            component mounts. §6.7 removes "Show results" — for everyone who
            has the script that makes removing it safe. */}
        {!hydrated && (
          <Button type="submit" size="md">
            {t('apply')}
          </Button>
        )}
      </div>

      {/* Mobile: one 44px button and a bottom sheet (§6.7). */}
      <div className="flex items-center gap-2 sm:hidden">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={() => setSheetOpen(true)}
        >
          <SlidersHorizontal aria-hidden />
          {activeCount > 0 ? t('filtersCount', { count: activeCount }) : t('filters')}
        </Button>
        <Select
          aria-label={t('sort')}
          value={current.sort ?? ''}
          onChange={(e) => apply({ sort: e.target.value || null })}
          className="w-auto max-w-[9.5rem]"
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      {sheetOpen && (
        <Sheet title={t('filters')} onClose={() => setSheetOpen(false)}>
          <div className="flex flex-col gap-4">{controls}</div>
          <div className="mt-2">{switches}</div>
          <div className="sticky bottom-0 -mx-4 mt-4 flex items-center gap-3 border-t bg-surface px-4 py-3">
            {hasAny && (
              <Button type="button" variant="ghost" onClick={clearAll}>
                {t('clearAll')}
              </Button>
            )}
            <Button type="button" size="lg" className="flex-1" onClick={() => setSheetOpen(false)}>
              {t('showResults', { count: total })}
            </Button>
          </div>
        </Sheet>
      )}
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 flex-1 sm:w-44 sm:flex-none', className)}>
      <label htmlFor={htmlFor} className="mb-1 block text-overline font-semibold uppercase text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * The bottom sheet §6.7 asks for: radius-xl top corners, drag handle,
 * role=dialog, focus trapped, Esc closes.
 *
 * A native `<dialog>` with showModal() gives the focus trap, the Esc handler,
 * the inertness of the page behind and the top layer for free — all four of
 * which are easy to get subtly wrong by hand, and three of which the previous
 * `<details>`-based disclosure did not have at all.
 */
function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'm-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-xl bg-surface p-0 text-foreground',
        'backdrop:bg-[oklch(0.17_0.03_262/0.5)]',
      )}
    >
      <div className="flex max-h-[85dvh] flex-col overflow-y-auto overscroll-contain p-4">
        <div className="mx-auto mb-3 h-1 w-10 rounded-pill bg-border-strong" aria-hidden />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-heading-md font-semibold">{title}</h2>
          <IconButton type="button" variant="ghost" label={title} onClick={onClose}>
            <X aria-hidden />
          </IconButton>
        </div>
        {children}
      </div>
    </dialog>
  );
}
