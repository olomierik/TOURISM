'use client';

import { useTranslations } from 'next-intl';
import { MapPin } from 'lucide-react';

import { Link } from '@/i18n/navigation';

import { HeroBackdrop, type HeroFrame } from '@/components/home/hero-backdrop';
import { DiscoverySearch } from '@/components/home/discovery-search';
import { TripPlanner } from '@/components/home/trip-planner';
import type { DestinationSummary } from '@/lib/queries/taxonomy';

/**
 * The homepage hero, Savanna Modern (2026-10).
 *
 * The photograph fills the first screen and the words sit at its foot, over a
 * scrim that darkens the top (for the header) and the bottom (for the copy)
 * and leaves the middle of the picture alone. One large headline, one line
 * under it, the search bar, then the categories as chips: a traveller can act
 * without scrolling, and the picture still does the selling.
 */
export function Hero({
  frames,
  destinations,
  categories,
}: {
  frames: HeroFrame[];
  destinations: DestinationSummary[];
  categories: Array<{ slug: string; name: string }>;
}) {
  const t = useTranslations('home.hero');

  return (
    <section className="relative isolate -mt-[var(--header-h)] flex min-h-[min(46rem,100svh)] flex-col justify-end pt-[var(--header-h)]">
      <HeroBackdrop frames={frames} />

      <div className="container-page relative z-10 pb-10 pt-24 md:pb-14 md:pt-32">
        <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-white backdrop-blur-md">
          <span className="size-2 rounded-full bg-emerald-400" aria-hidden />
          {t('eyebrow')}
        </p>

        <h1
          className="animate-fade-up mt-5 max-w-4xl text-[clamp(2.75rem,7vw,5.25rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-white"
          style={{ animationDelay: '60ms' }}
        >
          {t('title')}
        </h1>

        <p
          className="animate-fade-up mt-5 max-w-2xl text-lg leading-relaxed text-white/90 sm:text-xl"
          style={{ animationDelay: '120ms' }}
        >
          {t('subtitle')}
        </p>

        <div className="animate-fade-up mt-8 max-w-5xl" style={{ animationDelay: '180ms' }}>
          <DiscoverySearch categories={categories} destinations={destinations} />
        </div>

        <div
          className="animate-fade-up mt-5 flex flex-wrap items-center gap-2.5"
          style={{ animationDelay: '240ms' }}
        >
          <nav aria-label={t('browseBy')} className="contents">
            {categories.slice(0, 5).map((c) => (
              <Link
                key={c.slug}
                href={{ pathname: '/directory', query: { category: c.slug } }}
                className="inline-flex h-10 items-center rounded-full border border-white/30 bg-white/15 px-4 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white hover:text-foreground"
              >
                {c.name}
              </Link>
            ))}
          </nav>

          {/* The trip planner, kept: a whole-trip question is a different
              starting point from a search, and some visitors start there. */}
          <details className="group relative">
            <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-full bg-black/35 px-4 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-black/55">
              <MapPin className="size-4" aria-hidden />
              {t('plannerToggle')}
              <span className="text-xs transition-transform group-open:rotate-180" aria-hidden>
                ▼
              </span>
            </summary>
            <div className="absolute left-0 top-full z-50 mt-2 w-[min(28rem,calc(100dvw-2.5rem))] rounded-2xl border border-white/20 bg-white/95 p-4 shadow-xl backdrop-blur-xl sm:w-96">
              <TripPlanner destinations={destinations} />
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
