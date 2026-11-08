import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Calculator } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { QuoteStarter } from '@/components/home/quote-starter';
import { HeroSlideshow } from '@/components/home/hero-slideshow';
import type { HeroFrame } from '@/lib/queries/hero';
import type { ComboboxOption } from '@/components/ui/destination-combobox';
import { cn } from '@/lib/utils';

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
  const [t, tPrice] = await Promise.all([
    getTranslations('home.hero'),
    getTranslations('home.price'),
  ]);

  // Two photographs flank the slideshow. They are the next frames in the
  // rotation, so no extra image source is introduced.
  const side = frames.slice(1, 3);

  return (
    // Field-guide restyle (2026-10): a light sand wash with the words on the
    // left and a trio of rounded portrait photographs on the right, the middle
    // one being the existing slideshow (its LCP rules and pause control are
    // unchanged). The QuoteStarter keeps its place under the lead.
    <section className="bg-hero-wash relative isolate overflow-hidden">
      <div className="container-page grid gap-10 pb-8 pt-6 sm:pb-16 sm:pt-12 lg:min-h-[min(36rem,calc(100svh-var(--header-h)))] lg:grid-cols-12 lg:items-center lg:gap-12 lg:pb-16 lg:pt-10">
        {/* min-w-0: a grid item defaults to min-width:auto, so the horizontal
            chip row inside the QuoteStarter would widen this column past the
            viewport instead of scrolling inside itself. */}
        <div className="min-w-0 lg:col-span-7">
          <p className="chip-pill">{t('overline')}</p>

          {/* The owner's wording (2026-10): the H1 says who it is; the lead
              directly beneath says what the form does. */}
          <h1 className="mt-4 max-w-2xl text-balance font-display text-[clamp(2.25rem,4.4vw,3.75rem)] font-bold leading-[1.04] tracking-[-0.02em] text-foreground">
            {t.rich('title', {
              br: () => <br />,
            })}
          </h1>

          <p className="mt-3 max-w-lg text-[1.0625rem] leading-relaxed text-muted-foreground">{t('lead')}</p>

          <QuoteStarter destinations={destinations} className="mt-6 max-w-2xl" />

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-body-sm">
            <Button asChild variant="outline" size="md">
              <Link href="/trip-cost">
                <Calculator className="size-4" aria-hidden />
                {tPrice('cta')}
              </Link>
            </Button>
            <Link
              href="/directory"
              className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline"
            >
              {t('browseLink')}
              <span aria-hidden> {'→'}</span>
            </Link>
          </div>
        </div>

        {frames.length > 0 && (
          // Compact (2026-10): hidden on phones - the destinations row
          // below opens on the same photographs.
          <div className="min-w-0 max-sm:hidden lg:col-span-5">
            <div className="mx-auto grid max-w-md grid-cols-[1fr_1.2fr_1fr] items-start gap-3 sm:gap-4 lg:max-w-none">
              <SideFrame frame={side[0]} className="mt-10" />
              <figure className="relative aspect-[9/16] overflow-hidden rounded-[1.75rem] border-4 border-surface shadow-[var(--elev-xl)]">
                <HeroSlideshow
                  frames={frames.map((f) => ({
                    ...f,
                    alt: f.label ? t('photoAlt', { place: f.label }) : '',
                  }))}
                  pauseLabel={t('pauseSlideshow')}
                  playLabel={t('playSlideshow')}
                  sizes="(min-width:1024px) 220px, 33vw"
                  className="h-full w-full rounded-none"
                  // A narrow portrait card: pause above the dots, centred.
                  controlsClassName="flex-col-reverse justify-center gap-2 pb-3"
                />
                {/* §5.1.6: destination photos keep their credit. */}
                {frames[0].label && (
                  <figcaption className="pointer-events-none absolute inset-x-0 top-0 p-3 text-center text-caption font-medium text-night-text [text-shadow:0_1px_6px_rgb(0_0_0/0.55)]">
                    {frames[0].label}
                  </figcaption>
                )}
              </figure>
              <SideFrame frame={side[1]} className="mt-16" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SideFrame({ frame, className }: { frame?: HeroFrame; className?: string }) {
  return (
    <div
      className={cn(
        'relative aspect-[9/16] overflow-hidden rounded-[1.75rem] border-4 border-surface bg-surface-sunken shadow-[var(--elev-lg)]',
        className,
      )}
      aria-hidden
    >
      {frame && (
        <Image src={frame.src} alt="" fill sizes="(min-width:1024px) 200px, 30vw" quality={65} className="object-cover" />
      )}
    </div>
  );
}
