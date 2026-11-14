import { getLocale, getTranslations } from 'next-intl/server';
import { BadgeCheck, ShieldCheck, Sparkles, Star, UserCheck } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { SaveHeart } from '@/components/wishlist/save-heart';
import { showsRating } from '@/lib/badges';
import { CardImage } from '@/components/cards/card-image';
import { MediaFallback } from '@/components/media/media-fallback';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';
import type { BusinessCard as BusinessCardData } from '@/lib/queries/businesses';
import { whatsappHref } from '@/lib/contact/whatsapp';
import { cn } from '@/lib/utils';

/**
 * ListingCard — design.md §6.5.
 *
 *   [ media 4:3 | MediaFallback ]        ← Save IconButton (on-photo), top right
 *     overline:  LOCATION · COUNTRY      (country hidden when Tanzania)
 *     heading-sm: Business name          [tier badge]
 *     body-sm:   category · specialty    (claimed only)
 *     body-sm:   ★ 4.8 (12) · From US$180/day   (each only if the data exists)
 *     ─────────
 *     [ Request a quote (ghost, md) ]    [ WhatsApp IconButton ]
 *
 * Three things changed beyond the layout.
 *
 * **The monogram is gone.** A listing with no photograph showed its initials on
 * a coloured gradient — which reads as a logo the business never chose, on a
 * brand colour the site picked for it. §5.1.1 is blunt: no fake photos. It is
 * now MediaFallback: the category icon, the category name, and a surface that
 * says the slot is empty (§5.1.2).
 *
 * **Featured is labelled, and never looks like verification.** §6.4 gave
 * Featured no badge and §8.2 said it was never sold; both were reversed in
 * November 2026, when admin boosts (lib/queries/boosts.ts) became something
 * the business sells. A placement that can be bought must say so, so a boosted
 * card carries a "Featured" tag on its photograph — gold, top left, with
 * "promoted" in its title — and never the shield or tick that mean checked.
 *
 * **The country disappears when it is Tanzania.** §6.5. "Arusha · Tanzania" on
 * 2,618 of 2,618 cards spends the overline on the one fact every row shares.
 *
 * The specialty line is claimed-only, per §6.5. An unclaimed listing's tagline
 * is an import artefact — "Tour operator in Same, Tanzania" — and repeating the
 * location two lines under the location is worse than leaving the line out.
 */
export async function BusinessCard({
  business,
  className,
  size = 'default',
}: {
  business: BusinessCardData;
  className?: string;
  /**
   * `compact` is §6.5's horizontal variant: a 112 px thumbnail beside the text,
   * for search results and mobile lists. It is what keeps 12 directory rows
   * from filling 6,387 px.
   *
   * `responsive` is §7.2.5's rule for the directory — "ListingCard default on
   * ≥640 px, compact below" — expressed as classes rather than as two rendered
   * cards. A server component cannot read the viewport, and rendering both and
   * hiding one doubles the DOM on a page that already carries 24 of them.
   */
  size?: 'default' | 'compact' | 'responsive';
}) {
  const t = await getTranslations('common');
  const tCard = await getTranslations('card');
  const locale = await getLocale();
  const compact = size === 'compact';
  const responsive = size === 'responsive';
  /** Hidden in the 112px row, shown once the card is a card. */
  const onlyWide = responsive ? 'max-sm:hidden' : '';

  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: business.dayRateCurrency ?? 'USD',
      maximumFractionDigits: 0,
    }).format(n);

  // §6.5: the country is hidden when it is Tanzania, which is every row by
  // default (§9.3). It reappears the moment the viewer widens the scope, which
  // is exactly when it carries information.
  let country: string | null = null;
  if (business.countryCode && business.countryCode.toUpperCase() !== 'TZ') {
    try {
      country =
        new Intl.DisplayNames([locale], { type: 'region' }).of(
          business.countryCode.toUpperCase(),
        ) ?? null;
    } catch {
      country = business.countryCode;
    }
  }
  const place = [business.city ?? business.region, country].filter(Boolean).join(' · ');

  // §6.4: one tier badge, the highest the data supports. Verified listings have
  // had their licence checked against the registry; claimed ones have only had
  // the owner confirm they run the business; everything else is a public-source
  // record and says so.
  const tier = business.isVerified
    ? ({ variant: 'licence', icon: ShieldCheck, label: t('verified') } as const)
    : business.isClaimed
      ? ({ variant: 'claimed', icon: UserCheck, label: t('claimed') } as const)
      : ({ variant: 'listed', icon: null, label: t('unclaimed') } as const);
  const TierIcon = tier.icon;

  const specialty = business.isClaimed ? business.tagline : null;
  // The description, unless it only repeats the specialty line above it.
  //
  // "Repeats" is looser than equality (mobile audit, 2026-11-14). Operators
  // write the tagline as the opening of the description, so a phone row read
  // "Tour Guides · We specialize in wild…" and then "We specialize in Tanzania
  // wildlife…" directly under it — the same sentence twice, in the 60px a row
  // has to say anything. Sharing an opening counts as the same line.
  const opening = (s: string) => s.trim().toLowerCase().slice(0, 24);
  const description =
    business.shortDescription &&
    (!specialty || opening(business.shortDescription) !== opening(specialty))
      ? business.shortDescription
      : null;
  const metaLine = [business.categoryName, specialty].filter(Boolean).join(' · ');

  const quoteHref = {
    pathname: '/request-quote' as const,
    query: { business: business.slug },
  };

  return (
    <article
      className={cn(
        // §3.4: cards are --surface, 1px --border, radius-lg, --elev-xs,
        // hover --elev-md on a pointer device only.
        'group relative flex overflow-hidden rounded-lg border bg-surface shadow-[var(--elev-xs)]',
        // Tailwind v4 already gates `hover:` behind @media (hover: hover), so
        // this does not fire as a stuck state on touch — which is what §3.4
        // means by "hover at --elev-md (desktop only)".
        // Interface refresh: a deeper lift and a warm gold edge on hover, so
        // the card under the pointer is unmistakable in a grid of twelve.
        'transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)]',
        'hover:border-[color-mix(in_oklab,var(--gold)_35%,var(--border))] hover:shadow-[var(--elev-lg)]',
        business.isFeatured && 'border-[color-mix(in_oklab,var(--sun-400)_55%,var(--border))]',
        compact && 'items-stretch',
        responsive && 'max-sm:items-stretch sm:flex-col',
        !compact && !responsive && 'flex-col',
        className,
      )}
    >
      <div
        className={cn(
          'relative shrink-0 overflow-hidden bg-surface-sunken',
          compact && 'w-28 self-stretch',
          // 16/9, not 4/3. Two reasons, and they point the same way: the
          // CardSkeleton that stands in for this card on /directory and
          // /search is 16/9, so every result swapped in used to be 54px
          // taller than the box it replaced; and 4/3 spent that 54px on the
          // tallest thing in a card the grid shows twenty-four of.
          responsive && 'max-sm:w-28 max-sm:self-stretch sm:aspect-video',
          !compact && !responsive && 'aspect-video',
        )}
      >
        {business.coverImageUrl ? (
          <CardImage
            src={business.coverImageUrl}
            // §5.3: the listing-card row. Never a 1920px request for a 300px
            // slot — and 112px is the real slot below 640, which is where most
            // of this site is read.
            sizes={
              compact
                ? '112px'
                : responsive
                  ? '(min-width:1280px) 300px, (min-width:1024px) 33vw, (min-width:640px) 50vw, 112px'
                  : '(min-width:1280px) 300px, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw'
            }
            className="object-cover"
            categoryIcon={business.categoryIcon}
            categoryName={business.categoryName}
            fallbackSize={compact ? 'sm' : responsive ? 'responsive' : 'md'}
          />
        ) : (
          <MediaFallback
            icon={business.categoryIcon}
            label={compact ? null : business.categoryName}
            size={compact ? 'sm' : responsive ? 'responsive' : 'md'}
          />
        )}

        {/* Paid or chosen placement says so. A boosted card that looked like
            every other card would be an advert passing itself off as a
            ranking — which consumer law and AdSense policy both forbid, and
            which would cost the directory the trust it is selling. */}
        {business.isFeatured && (
          <span
            className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-xs bg-highlight px-1.5 py-0.5 text-overline font-semibold uppercase text-highlight-foreground shadow-[var(--elev-xs)]"
            title={tCard('featuredHelp')}
          >
            <Sparkles className="size-3" aria-hidden />
            <span className={compact ? 'sr-only' : responsive ? 'max-sm:sr-only' : undefined}>
              {tCard('featured')}
            </span>
          </span>
        )}

        {/* Save sits over the media because the card body is inside the
            stretched link; a control there would fight the link for the tap.
            It is dropped from the 112px thumbnail, where a 44px target would
            cover a third of the image. */}
        {!compact && (
          <div className={cn('absolute right-2 top-2 z-10', onlyWide)}>
            <SaveHeart businessId={business.id} />
          </div>
        )}
      </div>

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          compact && 'gap-0.5 p-2.5',
          responsive && 'max-sm:gap-0.5 max-sm:p-2.5 sm:gap-1 sm:p-3.5',
          !compact && !responsive && 'gap-1 p-3.5',
        )}
      >
        {place && (
          <p className="truncate text-overline font-semibold uppercase text-muted-foreground">
            {place}
          </p>
        )}

        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-heading-sm font-semibold leading-snug tracking-[-0.005em]">
            {/* Stretched link: the whole card is the target, but only the name
                is in the accessibility tree as link text. §6.5 clamps the
                listing title to one line and puts the full one in `title`. */}
            <Link
              href={{ pathname: '/business/[slug]', params: { slug: business.slug } }}
              title={business.name}
              className={cn(
                'block truncate after:absolute after:inset-0 hover:text-primary',
                // A phone row has the height for two lines, and "Serengeti
                // Plains Saf…" told a traveller less than the whole name does.
                responsive && 'max-sm:line-clamp-2 max-sm:whitespace-normal',
              )}
            >
              {business.name}
            </Link>
          </h3>
          {business.isVerified ? (
            <BadgeCheck
              className="mt-0.5 size-[1.125rem] shrink-0 text-success"
              role="img"
              aria-label={t('verified')}
            />
          ) : null}
        </div>

        {metaLine && (
          <p className="truncate text-body-sm text-muted-foreground" title={metaLine}>
            {metaLine}
          </p>
        )}

        {/* Mobile-first redesign (2026-11): one or two lines of what the
            business does, so a phone row can be judged without opening it.
            Phones only (owner's call, 2026-11-08): the desktop card stays as
            it was before the redesign. */}
        {responsive && description && (
          <p className="line-clamp-2 text-body-sm leading-snug text-muted-foreground sm:hidden">
            {description}
          </p>
        )}

        {/* §6.4/§6.5: each figure only if the data exists. Stars need three
            reviews; below that the listing says it is new rather than showing
            a one-person average dressed as a rating. */}
        {/* Compact (2026-10): the "New on Explore Tanzania" placeholder printed
            the same words on nearly every card, so the line now appears only
            when there is a rating or a price to show. */}
        {(showsRating(business.ratingCount) || business.dayRateLow !== null) && (
        <p className="flex flex-wrap items-center gap-x-1.5 text-body-sm text-muted-foreground">
          {showsRating(business.ratingCount) && (
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Star className="size-3.5 fill-[var(--sun-400)] text-[var(--sun-400)]" aria-hidden />
              <span className="tabular-nums">{business.ratingAvg.toFixed(1)}</span>
              <span className="font-normal text-muted-foreground">({business.ratingCount})</span>
            </span>
          )}
          {business.dayRateLow !== null && (
            <>
              {showsRating(business.ratingCount) && <span aria-hidden>·</span>}
              <span className="tabular-nums">
                {t('from')}{' '}
                <span className="font-semibold text-foreground">
                  {money(business.dayRateLow)}
                </span>
                {tCard('perDay')}
              </span>
            </>
          )}
        </p>
        )}

        {/* Phone row footer: the tier badge and the quote link on one line.
            The two-row footer below is the wide card's; on a 360px row it
            cost 90px, so it was hidden and took the trust signal with it. */}
        {responsive && (
          <div className="mt-auto flex items-center justify-between gap-2 pt-1.5 sm:hidden">
            {/* Only a badge that says something earned: Verified or Claimed.
                "From public sources" is the default state of nine rows in ten,
                and at 165px it pushed the quote link off a 360px row. Its
                absence says the same thing; the profile page still states it. */}
            {tier.variant !== 'listed' ? (
              <Badge variant={tier.variant}>
                {TierIcon && <TierIcon aria-hidden />}
                {tier.label}
              </Badge>
            ) : (
              <span />
            )}
            <Link
              href={quoteHref}
              className="relative z-10 -my-2 inline-flex min-h-11 items-center whitespace-nowrap px-1 text-body-sm font-semibold text-primary"
            >
              {tCard('getQuote')}
              <span aria-hidden className="ml-0.5">
                {'→'}
              </span>
            </Link>
          </div>
        )}

        {!compact && (
          <>
            {/* The tier badge sits with the actions rather than on the photo:
                over an image it competed with Save, and on half the cards
                there is no image to sit on. */}
            <div className={cn('mt-auto flex items-center gap-2 pt-2.5', onlyWide)}>
              <Badge variant={tier.variant}>
                {TierIcon && <TierIcon aria-hidden />}
                {tier.label}
              </Badge>
              {business.isDemo && <Badge variant="demo">{t('demoData')}</Badge>}
            </div>

            <div className={cn('mt-1.5 flex items-center gap-2 border-t pt-2.5', onlyWide)}>
              <Button
                asChild
                variant="ghost"
                size="md"
                className="relative z-10 flex-1 bg-primary-subtle hover:bg-primary hover:text-primary-foreground"
              >
                <Link href={quoteHref}>{tCard('getQuote')}</Link>
              </Button>
              {business.whatsapp && (
                <IconButton
                  asChild
                  variant="secondary"
                  label={tCard('whatsappLabel', { name: business.name })}
                  className="relative z-10"
                >
                  <a
                    href={whatsappHref(business.id, 'card', locale)}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                  >
                    <WhatsAppGlyph />
                  </a>
                </IconButton>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
