'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { track } from '@/lib/analytics/track';

type Option = { slug: string; name: string };

/**
 * The hero search.
 *
 * It submits to /directory with `q`, `category` and `destination` — the exact
 * parameters that page already reads. Nothing new is queried, nothing is
 * duplicated, and every filter, sort and pagination behaviour on the results
 * page works because the results page is the one that always existed.
 *
 * Three fields rather than one, because the question a visitor arrives with has
 * three parts: what, what kind, and where. A single box makes them phrase it as
 * a sentence and then guesses; the selects mean "car hire in Arusha" is two
 * clicks and cannot be misread.
 *
 * The categories and destinations are passed in from the server, already
 * fetched for other parts of the page. A search box that fetches its own
 * options is a second round trip to answer a question nobody has asked yet.
 */
export function DiscoverySearch({
  categories,
  destinations,
  defaults,
}: {
  categories: Option[];
  destinations: Option[];
  /**
   * Current values, when this is rendered on the results page itself. A search
   * bar that forgets what was searched makes refining a query mean retyping it.
   */
  defaults?: { q?: string; category?: string; destination?: string };
}) {
  const t = useTranslations('home.search');
  const router = useRouter();

  const [q, setQ] = useState(defaults?.q ?? '');
  const [category, setCategory] = useState(defaults?.category ?? '');
  const [destination, setDestination] = useState(defaults?.destination ?? '');

  const field =
    'h-12 w-full rounded-xl border-0 bg-transparent px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        track('search_started', { tool: 'hero' });
        router.push({
          pathname: '/directory',
          query: {
            ...(q.trim() ? { q: q.trim() } : {}),
            ...(category ? { category } : {}),
            ...(destination ? { destination } : {}),
          },
        });
      }}
      role="search"
      className="rounded-2xl bg-card p-2 shadow-xl ring-1 ring-black/5"
    >
      <div className="grid gap-1 md:grid-cols-[1.4fr_auto_1fr_auto_1fr_auto] md:items-center">
        <div className="min-w-0">
          <label htmlFor="hero-q" className="sr-only">
            {t('whatLabel')}
          </label>
          <input
            id="hero-q"
            name="q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('whatPlaceholder')}
            maxLength={120}
            autoComplete="off"
            className={field}
          />
        </div>

        <span className="hidden h-7 w-px bg-border md:block" aria-hidden />

        <div className="min-w-0">
          <label htmlFor="hero-category" className="sr-only">
            {t('categoryLabel')}
          </label>
          <select
            id="hero-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={field}
          >
            <option value="">{t('anyCategory')}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <span className="hidden h-7 w-px bg-border md:block" aria-hidden />

        <div className="min-w-0">
          <label htmlFor="hero-destination" className="sr-only">
            {t('whereLabel')}
          </label>
          <select
            id="hero-destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className={field}
          >
            <option value="">{t('anywhere')}</option>
            {destinations.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full bg-brand-gold text-brand-gold-foreground hover:bg-brand-gold/90 md:w-auto md:px-7"
        >
          <Search className="size-4" aria-hidden />
          {t('submit')}
        </Button>
      </div>
    </form>
  );
}
