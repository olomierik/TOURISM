import { getLocale, getTranslations } from 'next-intl/server';
import { Award, BadgeCheck, MessageCircle, Star, Timer, UserCheck } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { SaveHeart } from '@/components/wishlist/save-heart';
import { isTopRated, TOP_RATED } from '@/lib/badges';
import { MediaPlaceholder } from '@/components/cards/media-placeholder';
import { CardImage } from '@/components/cards/card-image';
import type { BusinessCard as BusinessCardData } from '@/lib/queries/businesses';
import { whatsappHref } from '@/lib/contact/whatsapp';
import { cn } from '@/lib/utils';

/**
 * A listing card, laid out the way GetYourGuide and Viator lay theirs out,
 * because that is the card travellers have learned to scan:
 *
 *   photograph, with the save heart and only the trust badges on it
 *   PLACE · COUNTRY            a small uppercase line, read first
 *   Name                       bold, two lines at most
 *   tagline                    one line, muted
 *   ★ rating (count)   from $X /day   the comparison row, pinned to the bottom
 *
 * Nothing is shown that the listing does not have: no rating without reviews,
 * no price without a published day rate, no response time without enquiries.
 * An empty footer is honest; an invented "4.8" is not.
 */
export async function BusinessCard({
  business,
  className,
  size = 'default',
}: {
  business: BusinessCardData;
  className?: string;
  /**
   * `compact` is the directory size: a 16:9 photograph instead of 4:3, tighter
   * padding and no tagline, so four rows fit a screen instead of two and a half.
   * The price stays: it is the number travellers compare.
   */
  size?: 'default' | 'compact';
}) {
  const t = await getTranslations('common');
  const tCard = await getTranslations('card');
  const locale = await getLocale();

  // Whole units, no decimals: the card is a scan surface.
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: business.dayRateCurrency ?? 'USD',
      maximumFractionDigits: 0,
    }).format(n);

  // The reader's own language for the country name ("Tansania", "Tanzanie"),
  // from the browser's data rather than a hand-kept table.
  let country: string | null = null;
  if (business.countryCode) {
    try {
      country =
        new Intl.DisplayNames([locale], { type: 'region' }).of(business.countryCode.toUpperCase()) ??
        null;
    } catch {
      country = business.countryCode;
    }
  }
  const place = [business.city ?? business.region, country].filter(Boolean).join(' · ');

  const compact = size === 'compact';
  const hasCompare = business.ratingCount > 0 || business.dayRateLow !== null;
  const sizes = '(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw';

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/60',
        'transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        className,
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden bg-muted',
          compact ? 'aspect-[16/9]' : 'aspect-[4/3]',
        )}
      >
        {/* No caption on the art: the place line under the photograph already
            names it, and most listings have no photograph, so a caption put
            the same place on the card twice. */}
        {business.coverImageUrl ? (
          <CardImage
            src={business.coverImageUrl}
            sizes={sizes}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            seed={business.slug}
            region={business.region}
          />
        ) : (
          <MediaPlaceholder
            seed={business.slug}
            className="size-full"
            region={business.region}
          />
        )}

        {/* The heart sits over the photograph rather than in the body, because
            the body is inside the stretched link that makes the whole card
            clickable — a button there would fight the link for the tap. It
            saves to the traveller's list, as on Viator; likes stay on the
            listing's own page. */}
        <div className="absolute right-3 top-3 z-10">
          <SaveHeart businessId={business.id} />
        </div>

        {/* Only the badges that say who stands behind the listing. Unclaimed,
            the default for nine in ten, carries none. */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 pr-12">
          {isTopRated(business.ratingAvg, business.ratingCount) && (
            <Badge
              className="border-transparent bg-card/95 text-foreground shadow-sm"
              title={tCard('topRatedHelp', { avg: TOP_RATED.minAvg, count: TOP_RATED.minCount })}
            >
              <Award className="size-3 text-warning" aria-hidden />
              {tCard('topRated')}
            </Badge>
          )}
          {business.tier === 'featured' && (
            <Badge variant="featured" className="border-transparent bg-card/95 shadow-sm">
              {t('featured')}
            </Badge>
          )}
          {business.isVerified ? (
            <Badge
              variant="verified"
              className="border-transparent bg-card/95 shadow-sm"
              title={t('verifiedHelp')}
            >
              <BadgeCheck className="size-3" aria-hidden />
              {t('verified')}
            </Badge>
          ) : business.isClaimed ? (
            <Badge
              variant="outline"
              className="border-transparent bg-card/95 text-xs font-medium shadow-sm"
              title={t('claimedHelp')}
            >
              <UserCheck className="size-3" aria-hidden />
              {t('claimed')}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {place && (
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {place}
          </p>
        )}

        <h3
          className={cn(
            'mt-1 line-clamp-2 font-bold leading-snug',
            'text-base',
          )}
        >
          {/* Stretched link: the whole card is the target, but only the name is
              in the accessibility tree as the link text. */}
          <Link
            href={{ pathname: '/business/[slug]', params: { slug: business.slug } }}
            className="after:absolute after:inset-0 hover:text-primary"
          >
            {business.name}
          </Link>
        </h3>

        {business.tagline && !compact && (
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{business.tagline}</p>
        )}

        {business.avgResponseMinutes !== null && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-success">
            <Timer className="size-3.5" aria-hidden />
            {tCard('respondsIn', {
              hours: Math.max(1, Math.round(business.avgResponseMinutes / 60)),
            })}
          </p>
        )}

        {/* The comparison row: rating on the left, price on the right, pinned to
            the bottom so it lines up across a row of cards. Tabular figures so
            the digits sit in columns down the grid. */}
        {hasCompare && (
          <div className="mt-auto flex items-end justify-between gap-3 pt-3 tabular-nums">
            {business.ratingCount > 0 ? (
              <span className="flex items-center gap-1 text-sm">
                <Star className="size-3.5 fill-warning text-warning" aria-hidden />
                <span className="font-semibold">{business.ratingAvg.toFixed(1)}</span>
                <span className="text-muted-foreground">({business.ratingCount})</span>
              </span>
            ) : (
              <span />
            )}
            {business.dayRateLow !== null && (
              <span className="text-right text-sm leading-tight">
                <span className="text-xs text-muted-foreground">{t('from')} </span>
                <span className="text-base font-bold">{money(business.dayRateLow)}</span>
                <span className="text-xs text-muted-foreground"> {tCard('perDay')}</span>
              </span>
            )}
          </div>
        )}

        {/* WhatsApp first: in East Africa it is how operators answer. Above the
            stretched link (z-10), so the tap opens the chat, not the listing.
            Through the tracked route, which counts it as a contact. */}
        {business.whatsapp && (
          <a
            href={whatsappHref(business.id, 'card', locale)}
            target="_blank"
            rel="nofollow noopener noreferrer"
            aria-label={tCard('whatsappLabel', { name: business.name })}
            className={cn(
              'relative z-10 inline-flex items-center gap-1.5 self-start rounded-full border border-success/40 px-3 py-1 text-xs font-semibold text-success transition-colors hover:bg-success/10',
              // Bottom-aligned across a row of cards, like the comparison row.
              hasCompare ? 'mt-3' : 'mt-auto',
            )}
          >
            <MessageCircle className="size-3.5" aria-hidden />
            {tCard('whatsapp')}
          </a>
        )}

        {business.isDemo && (
          <Badge variant="demo" className="mt-3 self-start">
            {t('demoData')}
          </Badge>
        )}
      </div>
    </article>
  );
}
