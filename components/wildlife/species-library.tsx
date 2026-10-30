'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Crown, Search, Volume2, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { SpeciesCardData } from '@/lib/wildlife/species';
import type { SpeciesGroup } from '@/lib/wildlife/types';
import { SpeciesCard } from './species-card';

type Group = 'all' | SpeciesGroup;
type SeenFilter = 'all' | 'seen' | 'notSeen';
type Sort = 'az' | 'rarity' | 'status';

const RARITY_RANK = { rare: 0, uncommon: 1, common: 2 } as const;
const IUCN_RANK: Record<string, number> = { CR: 0, EN: 1, VU: 2, NT: 3, DD: 4, LC: 5 };

/**
 * The browsable list. Everything happens in the browser: a hundred animals is
 * small enough that filtering locally is instant, works with a weak signal in
 * a park once the page has loaded, and needs no request per keystroke.
 */
export function SpeciesLibrary({
  species,
  seenSlugs,
}: {
  species: SpeciesCardData[];
  /** null when signed out: the "seen" filter is hidden rather than empty. */
  seenSlugs: string[] | null;
}) {
  const t = useTranslations('wildlife');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<Group>('all');
  const [bigFive, setBigFive] = useState(false);
  const [withCall, setWithCall] = useState(false);
  const [seenFilter, setSeenFilter] = useState<SeenFilter>('all');
  const [sort, setSort] = useState<Sort>('az');

  const seen = useMemo(() => new Set(seenSlugs ?? []), [seenSlugs]);

  const counts = useMemo(() => {
    const c = { all: species.length, mammal: 0, bird: 0, reptile: 0 };
    for (const s of species) c[s.group] += 1;
    return c;
  }, [species]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = species.filter((s) => {
      if (group !== 'all' && s.group !== group) return false;
      if (bigFive && !s.bigFive) return false;
      if (withCall && !s.hasCall) return false;
      if (seenFilter === 'seen' && !seen.has(s.slug)) return false;
      if (seenFilter === 'notSeen' && seen.has(s.slug)) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.scientific.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
    const byName = (a: SpeciesCardData, b: SpeciesCardData) => a.name.localeCompare(b.name);
    if (sort === 'az') list.sort(byName);
    if (sort === 'rarity') {
      list.sort((a, b) => RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity] || byName(a, b));
    }
    if (sort === 'status') {
      list.sort(
        (a, b) => (IUCN_RANK[a.iucn ?? ''] ?? 6) - (IUCN_RANK[b.iucn ?? ''] ?? 6) || byName(a, b),
      );
    }
    return list;
  }, [species, query, group, bigFive, withCall, seenFilter, seen, sort]);

  const filtered =
    query !== '' || group !== 'all' || bigFive || withCall || seenFilter !== 'all';

  const clear = () => {
    setQuery('');
    setGroup('all');
    setBigFive(false);
    setWithCall(false);
    setSeenFilter('all');
  };

  const groups: Group[] = ['all', 'mammal', 'bird', 'reptile'];

  return (
    <div>
      <div className="card-surface flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">{t('searchLabel')}</span>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="h-11 w-full rounded-sm border border-control bg-surface pl-10 pr-3 text-body text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <div className="flex items-center gap-2">
            <label htmlFor="wildlife-sort" className="text-label font-semibold text-muted-foreground">
              {t('sort.label')}
            </label>
            <select
              id="wildlife-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-11 rounded-sm border border-control bg-surface px-3 text-body-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="az">{t('sort.az')}</option>
              <option value="rarity">{t('sort.rarity')}</option>
              <option value="status">{t('sort.status')}</option>
            </select>
          </div>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={t('groupAll')}>
          {groups.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={group === g}
              onClick={() => setGroup(g)}
              className={cn(
                'inline-flex h-10 shrink-0 items-center gap-2 rounded-pill border px-4 text-body-sm font-semibold transition-colors',
                group === g
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-control bg-surface text-foreground hover:border-primary/60',
              )}
            >
              {g === 'all' ? t('groupAll') : t(`groups.${g}`)}
              <span
                className={cn(
                  'tabular-nums text-caption',
                  group === g ? 'text-primary-foreground/80' : 'text-muted-foreground',
                )}
              >
                {counts[g]}
              </span>
            </button>
          ))}

          <span aria-hidden className="mx-1 w-px shrink-0 self-stretch bg-border" />

          <Toggle on={bigFive} onClick={() => setBigFive((v) => !v)}>
            <Crown className="size-4" aria-hidden />
            {t('bigFiveOnly')}
          </Toggle>
          <Toggle on={withCall} onClick={() => setWithCall((v) => !v)}>
            <Volume2 className="size-4" aria-hidden />
            {t('withCall')}
          </Toggle>

          {seenSlugs && (
            <>
              <span aria-hidden className="mx-1 w-px shrink-0 self-stretch bg-border" />
              {(['all', 'seen', 'notSeen'] as const).map((v) =>
                v === 'all' ? null : (
                  <Toggle
                    key={v}
                    on={seenFilter === v}
                    onClick={() => setSeenFilter((cur) => (cur === v ? 'all' : v))}
                  >
                    {t(`seenFilter.${v}`)}
                  </Toggle>
                ),
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-body-sm font-semibold text-muted-foreground" aria-live="polite">
          {t('resultCount', { count: results.length })}
        </p>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <X className="size-4" aria-hidden />
            {t('clearFilters')}
          </Button>
        )}
      </div>

      {results.length === 0 ? (
        <EmptyState
          className="mt-4"
          title={t('noResults')}
          action={
            <Button variant="secondary" onClick={clear}>
              {t('clearFilters')}
            </Button>
          }
        />
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {results.map((s, i) => (
            <li key={s.slug}>
              <SpeciesCard species={s} seen={seen.has(s.slug)} priority={i < 4} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 shrink-0 items-center gap-2 rounded-pill border px-4 text-body-sm font-semibold transition-colors',
        on
          ? 'border-gold bg-gold/15 text-foreground'
          : 'border-control bg-surface text-foreground hover:border-gold/60',
      )}
    >
      {children}
    </button>
  );
}
