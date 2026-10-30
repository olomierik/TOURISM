import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { QuoteStarter } from '@/components/home/quote-starter';
import { HeroSlideshow } from '@/components/home/hero-slideshow';
import type { HeroFrame } from '@/lib/queries/hero';
import type { ComboboxOption } from '@/components/ui/destination-combobox';

/**
 * The homepage hero — design.md §7.1.1, "Hero (Quote-first)".
 *
 * Desktop is a 12-column grid on --surface-muted: seven columns of words and
 * the QuoteStarter, five columns holding one real photograph at 4:5 with its
 * credit. Mobile is the headline, two lines of lead, and the form — whose own
 * mobile shape is Where plus the button, so the first screen holds the promise
 * and the way to act on it.
 *
 * Two deletions worth naming.
 *
 * **The full-bleed photograph is gone.** It filled the first screen and the
 * words sat at its foot over a scrim; it looked good and it meant the headline
 * competed with a picture for the same pixels, in a design where the headline
 * is the proposition. §7.1 puts the photo beside the words instead, at a size
 * that is still the second thing you see.
 *
 * **The crossfade is gone.** §3.5: "No autoplaying carousels or crossfading
 * hero images. The current hero swaps between two photos; ship one LCP image."
 * Eight destination covers were being fetched to show one homepage. Now it is
 * one, `priority` with `fetchPriority="high"`, and the 640px variant on a
 * phone (§5.3).
 *
 * The photo is a destination cover, which is the one image source on this site
 * that actually resolves: every Tanzanian destination cover sits in Supabase
 * storage and returns 200, where 29 of 30 sampled business photos return 403.
 */
export async function Hero({
  frames,
  destinations,
}: {
  /**
   * The hero photographs. More than one makes it a slideshow (Erick, 2026-10),
   * which §3.5 forbids — see components/home/hero-slideshow.tsx for how the
   * costs that rule was guarding against are paid anyway.
   */
  frames: HeroFrame[];
  destinations: ComboboxOption[];
}) {
  const t = await getTranslations('home.hero');

  return (
    // Premium-safari redesign (2026-10): the photograph is full-bleed again,
    // behind the words, the way high-end safari houses open. The header above
    // stays opaque, so the white-links-on-white fault recorded in
    // site-header.tsx cannot come back. The slideshow, its LCP rules and its
    // pause control are unchanged; only where it sits moved.
    <section className="relative isolate overflow-hidden bg-night text-night-text">
      {frames.length > 0 && (
        <figure className="absolute inset-0 -z-10">
          <HeroSlideshow
            frames={frames.map((f) => ({
              ...f,
              alt: f.label ? t('photoAlt', { place: f.label }) : '',
            }))}
            pauseLabel={t('pauseSlideshow')}
            playLabel={t('playSlideshow')}
            sizes="100vw"
            className="h-full w-full rounded-none"
            controlsClassName="container-page pb-5"
          />
          <div className="hero-scrim pointer-events-none absolute inset-0" aria-hidden />
          {/* §5.1.6: destination photos keep their credit. */}
          {frames[0].label && (
            <figcaption className="pointer-events-none absolute right-0 top-0 hidden p-5 text-caption tracking-wide text-night-muted lg:block">
              {frames[0].label}
            </figcaption>
          )}
        </figure>
      )}

      {/* pointer-events-none on the frame so the slideshow's dots and pause
          button underneath stay pressable; every real control opts back in. */}
      <div className="container-page pointer-events-none grid gap-10 pb-20 pt-14 sm:pb-24 sm:pt-20 lg:min-h-[min(46rem,calc(100svh-var(--header-h)))] lg:grid-cols-12 lg:items-center lg:gap-12 lg:pb-24 lg:pt-20">
        {/* min-w-0: a grid item defaults to min-width:auto, so the horizontal
            chip row inside the QuoteStarter would widen this column past the
            viewport instead of scrolling inside itself. */}
        <div className="on-photo pointer-events-auto min-w-0 lg:col-span-7">
          <p className="flex items-center gap-3 text-overline font-semibold uppercase tracking-[0.22em] text-highlight">
            <span className="h-px w-8 bg-highlight" aria-hidden />
            {t('overline')}
          </p>

          {/* The owner's wording (2026-10): the H1 says who it is; the lead
              directly beneath says what the form does. */}
          <h1 className="mt-5 max-w-3xl text-balance font-display text-[clamp(2.25rem,4.2vw,3.5rem)] font-semibold uppercase leading-[0.98] tracking-[0.01em] text-night-text">
            {t.rich('title', {
              br: () => <br />,
            })}
          </h1>

          <p className="mt-6 max-w-lg text-body-lg text-night-text/85">{t('lead')}</p>

          <p className="mt-6 text-body-sm">
            <Link
              href="/directory"
              className="font-semibold text-night-text underline decoration-highlight decoration-2 underline-offset-[6px] transition-colors hover:text-highlight"
            >
              {t('browseLink')}
              <span aria-hidden> {'→'}</span>
            </Link>
          </p>
        </div>

        <div className="pointer-events-auto min-w-0 text-foreground lg:col-span-5 lg:col-start-8">
          <QuoteStarter destinations={destinations} className="max-w-xl lg:ml-auto" />
        </div>
      </div>
    </section>
  );
}
