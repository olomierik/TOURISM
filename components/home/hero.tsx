'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, ShieldCheck } from 'lucide-react';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { HeroScene } from '@/components/home/hero-scene';

export function Hero() {
  const t = useTranslations('home.hero');
  const router = useRouter();
  const [query, setQuery] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    // Empty search goes to the unfiltered directory rather than a dead-end
    // results page — the spec is explicit about no controls that do nothing.
    router.push(q ? { pathname: '/search', query: { q } } : '/directory');
  }

  return (
    // The sticky header sits in normal flow, so the hero pulls up by exactly the
    // header's height to slide behind it, then pads that height back in. Without
    // this the transparent header floats over the page background instead of the
    // sky, and its white nav text becomes unreadable.
    <section className="relative isolate -mt-[var(--header-h)] flex min-h-[min(92svh,52rem)] items-center pt-[var(--header-h)]">
      <HeroScene />

      <div className="container-page relative z-10 py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="animate-fade-up text-sm font-medium uppercase tracking-[0.18em] text-white/80">
            {t('eyebrow')}
          </p>

          <h1
            className="animate-fade-up mt-5 text-balance text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl"
            style={{ animationDelay: '60ms' }}
          >
            {t('title')}
          </h1>

          <p
            className="animate-fade-up mt-6 max-w-xl text-lg leading-relaxed text-white/85"
            style={{ animationDelay: '120ms' }}
          >
            {t('subtitle')}
          </p>

          <form
            onSubmit={onSubmit}
            className="animate-fade-up mt-9"
            style={{ animationDelay: '180ms' }}
            role="search"
          >
            <div className="flex flex-col gap-2.5 rounded-2xl border border-white/25 bg-white/12 p-2.5 backdrop-blur-md sm:flex-row sm:items-center sm:rounded-full sm:p-2">
              <label htmlFor="hero-search" className="sr-only">
                {t('searchPlaceholder')}
              </label>
              <div className="flex flex-1 items-center gap-3 px-3">
                <Search className="size-5 shrink-0 text-white/70" aria-hidden />
                <input
                  id="hero-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="h-11 w-full min-w-0 bg-transparent text-base text-white placeholder:text-white/60 focus:outline-none"
                />
              </div>
              <Button type="submit" size="lg" className="shrink-0 sm:rounded-full">
                {t('searchButton')}
              </Button>
            </div>
          </form>

          <p
            className="animate-fade-up mt-6 flex items-center gap-2 text-sm text-white/75"
            style={{ animationDelay: '240ms' }}
          >
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            {t('trustNote')}
          </p>
        </div>
      </div>
    </section>
  );
}
