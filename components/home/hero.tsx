'use client';

import { useTranslations } from 'next-intl';
import { ShieldCheck } from 'lucide-react';

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
  /** For the search's category select — already fetched for the rail below. */
  categories: Array<{ slug: string; name: string }>;
}) {
  const t = useTranslations('home.hero');
  return (
    // The sticky header sits in normal flow, so the hero pulls up by exactly the
    // header's height to slide behind it, then pads that height back in. Without
    // this the transparent header floats over the page background instead of the
    // sky, and its white nav text becomes unreadable.
    <section className="relative isolate -mt-[var(--header-h)] flex min-h-[min(92svh,52rem)] items-center pt-[var(--header-h)]">
      <HeroBackdrop frames={frames} />

      <div className="container-page relative z-10 py-24 md:py-32">
        <div className="max-w-3xl">
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

          {/* The search leads, because the site's promise is "find anything in
              Tanzania" and this is the sentence that delivers it. It posts to
              /directory with the parameters that page already reads. */}
          <div
            className="animate-fade-up mt-9"
            style={{ animationDelay: '180ms' }}
          >
            <DiscoverySearch categories={categories} destinations={destinations} />
          </div>

          {/* The trip planner stays, one step down. It is a better tool than the
              search for somebody planning a whole trip, and a worse one for
              somebody looking for a car hire firm — which is most people. */}
          <details
            className="animate-fade-up group mt-5"
            style={{ animationDelay: '210ms' }}
          >
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-white/85 hover:text-white">
              {t('plannerToggle')}
              <span className="transition-transform group-open:rotate-90" aria-hidden>
                ›
              </span>
            </summary>
            <div className="mt-4">
              <TripPlanner destinations={destinations} />
            </div>
          </details>

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
