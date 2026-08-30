'use client';

import { useTranslations } from 'next-intl';
import { ShieldCheck } from 'lucide-react';

import { HeroBackdrop, type HeroFrame } from '@/components/home/hero-backdrop';
import { TripPlanner } from '@/components/home/trip-planner';
import type { DestinationSummary } from '@/lib/queries/taxonomy';

export function Hero({
  frames,
  destinations,
}: {
  frames: HeroFrame[];
  destinations: DestinationSummary[];
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

          <div
            className="animate-fade-up mt-9"
            style={{ animationDelay: '180ms' }}
          >
            <TripPlanner destinations={destinations} />
          </div>

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
