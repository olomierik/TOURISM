import { getTranslations } from 'next-intl/server';

import { DiscoverySearch } from '@/components/home/discovery-search';
import { HeroSlideshow } from '@/components/home/hero-slideshow';
import type { HeroFrame } from '@/lib/queries/hero';

type Option = { slug: string; name: string };

/**
 * The homepage hero — mobile-first redesign (2026-11).
 *
 *   ┌───────────────────────────────┐
 *   │ photograph (the slideshow)    │   ← one rounded card, scrim at the foot
 *   │ Free · No booking fees        │
 *   │ Discover East Africa.         │
 *   │ Your Journey Starts Here.     │
 *   │ lead                          │
 *   └──┬─────────────────────────┬──┘
 *      │ What · Category · Where │       ← search card overlapping the photo
 *      │ [ Search ]              │
 *      └─────────────────────────┘
 *
 * Why this replaces the quote-first hero. The previous first screen on a
 * phone was a four-field enquiry form with the photographs hidden: it asked a
 * visitor to describe a trip before they had seen a single place or operator.
 * The owner's brief puts discovery first — what the site is, a photograph of
 * where you are going, and a search — and moves the enquiry form to its own
 * band further down the page (EnquiryBand), where a visitor who has browsed
 * is ready for it. Conversion is not lost: "Get free quotes" stays in the
 * header, the drawer, every listing card and that band.
 *
 * The photograph is the existing slideshow, so its LCP rules hold: only the
 * first frame is eager and high priority, the rest are lazy, the pause control
 * stays (WCAG 2.2.2), and reduced motion stops it. The words sit on a scrim
 * that is darkest where they are, so they stay legible over any frame.
 */
export async function Hero({
  frames,
  categories,
  destinations,
}: {
  frames: HeroFrame[];
  categories: Option[];
  destinations: Option[];
}) {
  const t = await getTranslations('home.hero');

  return (
    <section className="relative">
      <div className="container-page pt-3 sm:pt-6 lg:pt-8">
        <div className="relative isolate overflow-hidden rounded-[1.5rem] bg-[var(--night-900)] text-[var(--night-text)] shadow-[var(--elev-lg)] sm:rounded-[1.75rem]">
          {frames.length > 0 && (
            <HeroSlideshow
              frames={frames.map((f) => ({
                ...f,
                alt: f.label ? t('photoAlt', { place: f.label }) : '',
              }))}
              pauseLabel={t('pauseSlideshow')}
              playLabel={t('playSlideshow')}
              sizes="(min-width:1280px) 1216px, 100vw"
              className="absolute inset-0 -z-10 rounded-none"
              // Top right: the search card covers the photograph's foot.
              controlsClassName="top-0 bottom-auto justify-end"
            />
          )}
          {/* Darkest at the foot, where the words are. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(20_16_12/0.88)_0%,rgb(20_16_12/0.55)_45%,rgb(20_16_12/0.12)_100%)]"
          />

          <div className="flex min-h-[20rem] flex-col justify-end px-5 pb-12 pt-14 sm:min-h-[24rem] sm:px-8 sm:pb-16 lg:min-h-[27rem] lg:px-12 lg:pb-20">
            <p className="w-fit rounded-pill border border-white/25 bg-white/10 px-3 py-1 text-caption font-semibold text-white backdrop-blur-sm">
              {t('overline')}
            </p>
            {/* Strong without eating the screen: two short lines on a 360px
                phone, and capped so a desktop does not get a billboard. */}
            <h1 className="mt-3 max-w-3xl text-balance font-display text-[clamp(1.625rem,6.6vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.02em] text-white">
              {t.rich('title', { br: () => <br /> })}
            </h1>
            <p className="mt-2.5 max-w-xl text-body-sm leading-relaxed text-white/85 sm:text-[1.0625rem]">
              {t('discoverLead')}
            </p>
          </div>
        </div>

        <div className="relative z-10 -mt-8 px-2 sm:-mt-10 sm:px-6 lg:px-12">
          <DiscoverySearch categories={categories} destinations={destinations} />
        </div>
      </div>
    </section>
  );
}
