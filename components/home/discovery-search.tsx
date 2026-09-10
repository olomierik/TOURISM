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
      className="mx-auto flex w-full flex-col gap-2 rounded-[2rem] bg-card p-2 shadow-2xl ring-1 ring-black/5 md:flex-row md:items-center md:gap-0 md:rounded-full"
    >
      {/* WHAT (Keyword) */}
      <label className="group flex flex-1 cursor-text flex-col justify-center rounded-full px-6 py-2.5 transition-colors hover:bg-secondary/70 focus-within:bg-secondary">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">
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
          className="mt-0.5 w-full truncate bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
        />
      </label>

      {/* DIVIDER */}
      <span className="hidden h-10 w-px bg-border md:block" aria-hidden />

      {/* CATEGORY (Clean Native Select) */}
      <label className="group flex flex-1 cursor-pointer flex-col justify-center rounded-full px-6 py-2.5 transition-colors hover:bg-secondary/70 focus-within:bg-secondary">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">
          {t('categoryLabel')}
        </span>
        <select
          id="hero-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-0.5 w-full cursor-pointer appearance-none bg-transparent text-sm font-medium text-foreground outline-none"
        >
          <option value="">{t('anyCategory')}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {/* DIVIDER */}
      <span className="hidden h-10 w-px bg-border md:block" aria-hidden />

      {/* WHERE (Searchable Auto-complete Datalist) */}
      <label className="group relative flex flex-1 cursor-text flex-col justify-center rounded-full px-6 py-2.5 transition-colors hover:bg-secondary/70 focus-within:bg-secondary">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">
          {t('whereLabel')}
        </span>
        <input
          list="destinations-list"
          id="hero-destination"
          value={destName}
          onChange={(e) => setDestName(e.target.value)}
          placeholder={t('anywhere')}
          autoComplete="off"
          className="mt-0.5 w-full truncate bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        {/* This invisible datalist creates the native browser auto-complete dropdown! */}
        <datalist id="destinations-list">
          {destinations.map((d) => (
            <option key={d.slug} value={d.name} />
          ))}
        </datalist>
      </label>

      {/* SUBMIT BUTTON */}
      <div className="p-1.5">
        <Button
          type="submit"
          size="icon"
          className="size-12 rounded-full bg-accent text-accent-foreground shadow-md transition-all hover:scale-105 active:scale-95 hover:bg-accent/90"
        >
          <Search className="size-5" />
          <span className="sr-only">{t('submit')}</span>
        </Button>
      </div>
    </form>
  );
}
