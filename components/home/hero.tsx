'use client';

import { useTranslations } from 'next-intl';
import { ShieldCheck, MapPin } from 'lucide-react';

import { Link } from '@/i18n/navigation';

import { HeroBackdrop, type HeroFrame } from '@/components/home/hero-backdrop';
import { DiscoverySearch } from '@/components/home/discovery-search';
import { TripPlanner } from '@/components/home/trip-planner';
import type { DestinationSummary } from '@/lib/queries/taxonomy';

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
    <section className="relative isolate -mt-[var(--header-h)] flex flex-col justify-center pt-[var(--header-h)]">
      <HeroBackdrop frames={frames} />

      {/* Increased padding slightly so the new glass card breathes, but keeping it 
          constrained so inventory is still visible above the fold. */}
      <div className="container-page relative z-10 pb-10 pt-12 md:pb-12 md:pt-16">
        <div className="max-w-4xl mx-auto md:mx-0">
          
          {/* 1. TYPOGRAPHY HEADER */}
          <div className="max-w-2xl">
            <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-md">
              <span className="size-2 rounded-full bg-green-400 animate-pulse" />
              {t('eyebrow')}
            </p>

            <h1
              className="animate-fade-up mt-5 text-balance text-4xl font-bold leading-[1.1] text-white sm:text-5xl md:text-6xl drop-shadow-md"
              style={{ animationDelay: '60ms' }}
            >
              {t('title')}
            </h1>

            <p
              className="animate-fade-up mt-4 max-w-xl text-lg font-medium leading-relaxed text-white/90 drop-shadow"
              style={{ animationDelay: '120ms' }}
            >
              {t('subtitle')}
            </p>
          </div>

          {/* 2. THE UNIFIED SEARCH WIDGET (Glassmorphism) */}
          <div 
            className="animate-fade-up mt-8 md:mt-10 rounded-2xl md:rounded-3xl border border-white/20 bg-white/15 p-4 md:p-6 shadow-2xl backdrop-blur-md"
            style={{ animationDelay: '180ms' }}
          >
            {/* Tabs moved ABOVE search. This matches Booking.com mental model: 
                "What am I looking for?" -> "Now let me search for it." */}
            <nav
              aria-label={t('browseBy')}
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden border-b border-white/10 mb-4"
            >
              {categories.slice(0, 6).map((c) => (
                <Link
                  key={c.slug}
                  href={{ pathname: '/directory', query: { category: c.slug } }}
                  className="shrink-0 whitespace-nowrap rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white hover:text-black hover:shadow-lg"
                >
                  {c.name}
                </Link>
              ))}
            </nav>

            {/* The Search Bar Component */}
            <div className="w-full">
              <DiscoverySearch categories={categories} destinations={destinations} />
            </div>
          </div>

          {/* 3. SECONDARY ACTIONS & TRUST */}
          <div 
            className="animate-fade-up mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ animationDelay: '240ms' }}
          >
            {/* Styled the details toggle to look like a secondary action button */}
            <details className="group relative">
              <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl bg-black/40 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-black/60 border border-white/10">
                <MapPin className="size-4" />
                {t('plannerToggle')}
                <span className="transition-transform group-open:rotate-180" aria-hidden>
                  ▼
                </span>
              </summary>
              <div className="absolute left-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-white/20 bg-white/95 p-4 shadow-xl backdrop-blur-xl sm:w-96">
                <TripPlanner destinations={destinations} />
              </div>
            </details>

            <p className="flex items-center gap-2 text-sm font-medium text-white/90 drop-shadow">
              <ShieldCheck className="size-5 text-green-400 shrink-0" aria-hidden />
              {t('trustNote')}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
