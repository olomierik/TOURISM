'use client';

import { useTranslations } from 'next-intl';
import { ShieldCheck } from 'lucide-react';

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
  /** For the search's category select — already fetched for the rail below. */
  categories: Array<{ slug: string; name: string }>;
}) {
  const t = useTranslations('home.hero');
  return (
    // The sticky header sits in normal flow, so the hero pulls up by exactly the
    // header's height to slide behind it, then pads that height back in. Without
    // this the transparent header floats over the page background instead of the
    // sky, and its white nav text becomes unreadable.
    /* A band, not a screen.
    
       Measured on the live site: the first listing a reader could click into
       sat 1,578px down — the hero alone was 905px of photograph for one search
       box, then a grid of category icons, and only then anything browsable.
       Booking.com reaches inventory at roughly 480px, and it does that by never
       giving a whole screen to a picture.
    
       The photograph stays, because it is what this site is actually selling.
       It just stops being the entire first impression. */
    <section className="relative isolate -mt-[var(--header-h)] flex items-center pt-[var(--header-h)]">
      <HeroBackdrop frames={frames} />

      <div className="container-page relative z-10 pb-7 pt-10 md:pb-8 md:pt-14">
        <div className="max-w-3xl">
          <p className="animate-fade-up text-sm font-medium uppercase tracking-[0.18em] text-white/80">
            {t('eyebrow')}
          </p>

          <h1
            className="animate-fade-up mt-3 text-balance text-3xl font-semibold leading-[1.05] text-white sm:text-4xl"
            style={{ animationDelay: '60ms' }}
          >
            {t('title')}
          </h1>

          <p
            className="animate-fade-up mt-3 max-w-xl leading-relaxed text-white/85"
            style={{ animationDelay: '120ms' }}
          >
            {t('subtitle')}
          </p>

          {/* The search leads, because the site's promise is "find anything in
              Tanzania" and this is the sentence that delivers it. It posts to
              /directory with the parameters that page already reads. */}
          <div
            className="animate-fade-up mt-6"
            style={{ animationDelay: '180ms' }}
          >
            <DiscoverySearch categories={categories} destinations={destinations} />
          </div>

          {/* The kind of thing, before the search.
          
              Borrowed straight from booking.com, where Stays / Flights / Car
              rental sit above the box: most people arrive knowing what sort of
              thing they want and not what it is called. These were previously
              only available as an icon grid below the fold, which meant the
              answer to "what can I even look for here" required a scroll. */}
          <nav
            aria-label={t('browseBy')}
            /* One line, scrolled rather than wrapped. Six category names —
               "Safaris & Tour Operators", "Hotels & Accommodation" — wrapped to
               two rows and cost 81px of the fold on their own. A tab row that
               wraps stops reading as tabs. */
            className="animate-fade-up -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
            style={{ animationDelay: '210ms' }}
          >
            {categories.slice(0, 6).map((c) => (
              <Link
                key={c.slug}
                href={{ pathname: '/directory', query: { category: c.slug } }}
                className="shrink-0 whitespace-nowrap rounded-full border border-white/30 bg-white/12 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                {c.name}
              </Link>
            ))}
          </nav>

          {/* The trip planner stays, one step down. It is a better tool than the
              search for somebody planning a whole trip, and a worse one for
              somebody looking for a car hire firm — which is most people. */}
          <details
            className="animate-fade-up group mt-5"
            style={{ animationDelay: '240ms' }}
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
            className="animate-fade-up mt-4 flex items-center gap-2 text-sm text-white/75"
            style={{ animationDelay: '270ms' }}
          >
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            {t('trustNote')}
          </p>
        </div>
      </div>
    </section>
  );
}
