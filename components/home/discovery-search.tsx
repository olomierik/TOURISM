'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { track } from '@/lib/analytics/track';

type Option = { slug: string; name: string };

export function DiscoverySearch({
  categories,
  destinations,
  defaults,
}: {
  categories: Option[];
  destinations: Option[];
  defaults?: { q?: string; category?: string; destination?: string };
}) {
  const t = useTranslations('home.search');
  const router = useRouter();

  const [q, setQ] = useState(defaults?.q ?? '');
  const [category, setCategory] = useState(defaults?.category ?? '');
  
  // For the searchable autocomplete, we track the NAME the user types,
  // then match it to the SLUG when they submit.
  const initialDestName = defaults?.destination 
    ? destinations.find(d => d.slug === defaults?.destination)?.name || '' 
    : '';
  const [destName, setDestName] = useState(initialDestName);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        track('search_started', { tool: 'hero' });
        
        // Find the slug that matches the text the user typed in the autocomplete
        const finalDestSlug = destinations.find(
          (d) => d.name.toLowerCase() === destName.toLowerCase()
        )?.slug || '';

        router.push({
          pathname: '/directory',
          query: {
            ...(q.trim() ? { q: q.trim() } : {}),
            ...(category ? { category } : {}),
            // Only submit the destination if we found a valid slug match
            ...(finalDestSlug ? { destination: finalDestSlug } : {}),
          },
        });
      }}
      role="search"
      // 1. THE PILL DESIGN: Fully rounded, shadow, white/card background.
      className="mx-auto flex w-full flex-col gap-1 rounded-[1.25rem] bg-card p-1.5 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.45)] ring-1 ring-black/5 sm:gap-1.5 sm:p-2 md:flex-row md:items-stretch"
    >
      {/* WHAT (Keyword) */}
      {/* Wider than its neighbours: it carries the longest placeholder, which
          three equal columns cut at every width. */}
      <label className="group flex flex-1 cursor-text flex-col justify-center rounded-2xl bg-secondary px-4 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-ring/30 sm:px-5 sm:py-3 md:flex-[1.6]">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-foreground sm:text-xs">
          {t('whatLabel')}
        </span>
        <input
          id="hero-q"
          name="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('whatPlaceholder')}
          maxLength={120}
          autoComplete="off"
          className="mt-0.5 w-full truncate bg-transparent text-base font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground/70"
        />
      </label>


      {/* CATEGORY (Clean Native Select) */}
      <label className="group flex flex-1 cursor-pointer flex-col justify-center rounded-2xl px-4 py-2.5 transition-colors hover:bg-secondary/70 focus-within:bg-secondary sm:px-5 sm:py-3">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-foreground sm:text-xs">
          {t('categoryLabel')}
        </span>
        <select
          id="hero-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-0.5 w-full cursor-pointer appearance-none bg-transparent text-base font-semibold text-foreground outline-none"
        >
          <option value="">{t('anyCategory')}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>


      {/* WHERE (Searchable Auto-complete Datalist) */}
      <label className="group relative flex flex-1 cursor-text flex-col justify-center rounded-2xl px-4 py-2.5 transition-colors hover:bg-secondary/70 focus-within:bg-secondary sm:px-5 sm:py-3">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-foreground sm:text-xs">
          {t('whereLabel')}
        </span>
        <input
          list="destinations-list"
          id="hero-destination"
          value={destName}
          onChange={(e) => setDestName(e.target.value)}
          placeholder={t('anywhere')}
          autoComplete="off"
          className="mt-0.5 w-full truncate bg-transparent text-base font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground/70"
        />
        {/* This invisible datalist creates the native browser auto-complete dropdown! */}
        <datalist id="destinations-list">
          {destinations.map((d) => (
            <option key={d.slug} value={d.name} />
          ))}
        </datalist>
      </label>

      {/* SUBMIT: always labelled. Full width where the fields stack (phones
          and tablets), its own block at the end of the row from lg up. */}
      <Button
        type="submit"
        variant="accent"
        className="h-12 w-full rounded-2xl px-7 text-base font-bold shadow-md active:scale-[0.98] sm:h-14 md:h-auto md:min-h-14 md:w-auto"
      >
        <Search className="size-5" aria-hidden />
        {t('submit')}
      </Button>
    </form>
  );
}
