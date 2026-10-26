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
    <section className="bg-surface-muted">
      <div className="container-page grid gap-8 py-10 sm:py-14 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-16">
        {/* min-w-0: a grid item defaults to min-width:auto, so the horizontal
            chip row inside the QuoteStarter would widen this column past the
            viewport instead of scrolling inside itself — which it did, at
            375px, by 222px. */}
        <div className="min-w-0 lg:col-span-7">
          <p className="text-overline font-semibold uppercase text-primary">{t('overline')}</p>

          {/* §7.1: display-2xl, with the operator promise emphasised rather
              than the place name. The old H1 was "Find your Tanzania." — a
              mood. This one says what happens if you use the form below it. */}
          {/* The owner's wording (2026-10). It replaces §7.1's quote-first
              headline — "Get safari quotes from up to six licensed Tanzanian
              operators" — which stated the offer in the H1. The proposition
              now lives in the lead directly beneath, so the page still says
              what it does; the H1 says who it is. */}
          <h1 className="mt-3 max-w-3xl text-balance font-display text-display-2xl uppercase tracking-[-0.01em] text-foreground">
            {t.rich('title', {
              br: () => <br />,
            })}
          </h1>

          <p className="mt-4 max-w-xl text-body-lg text-muted-foreground">{t('lead')}</p>

          <QuoteStarter destinations={destinations} className="mt-6 max-w-xl" />

          {/* The link §7.1 asks for, without its "Just browsing?" preamble —
              a question the page asks on the reader's behalf and then answers
              is filler, and this screen already carries enough words. */}
          <p className="mt-4 text-body-sm">
            <Link
              href="/directory"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t('browseLink')}
              <span aria-hidden> {'→'}</span>
            </Link>
          </p>
        </div>

        {frames.length > 0 && (
          <figure className="relative lg:col-span-5">
            <HeroSlideshow
              frames={frames.map((f) => ({
                ...f,
                alt: f.label ? t('photoAlt', { place: f.label }) : '',
              }))}
              pauseLabel={t('pauseSlideshow')}
              playLabel={t('playSlideshow')}
              className="aspect-[4/5]"
            />
            {/* §5.1.6: destination photos keep their credit. The caption names
                the first frame; naming all eight would be a paragraph under a
                photograph. */}
            {frames[0].label && (
              <figcaption className="mt-2 text-caption text-muted-foreground">
                {frames[0].label}
              </figcaption>
            )}
          </figure>
        )}
      </div>
    </section>
  );
}
