import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import { BadgeCheck, MapPin, Star, Timer, Wallet, MessageSquare, Camera } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { MediaPlaceholder } from '@/components/cards/media-placeholder';
import { LikeButton } from '@/components/engagement/like-button';
import type { BusinessCard as BusinessCardData } from '@/lib/queries/businesses';
import { cn } from '@/lib/utils';

export async function BusinessCard({
  business,
  className,
  size = 'default',
}: {
  business: BusinessCardData;
  className?: string;
  /**
   * `compact` is the directory size: a 16:9 image instead of 16:10, tighter
   * padding, no tagline and no day rate. It brings a card from 347px to about
   * 250px, which is the difference between four rows of results per screen and
   * two and a half.
   *
   * The tagline and rate are not lost — they are on the listing, and the rate
   * is also a filter. What a reader scans a directory for is the name, the
   * place and whether anybody vouches for it.
   */
  size?: 'default' | 'compact';
}) {
  const t = await getTranslations('common');
  const tCard = await getTranslations('card');
  const locale = await getLocale();

  // Whole units, no decimals: the card is a scan surface, and "$180–$450/day"
  // is read faster than "US$180.00 – US$450.00".
  const rate = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: business.dayRateCurrency ?? 'USD',
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-md',
        className,
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden bg-muted',
          size === 'compact' ? 'aspect-[16/9]' : 'aspect-[16/10]',
        )}
      >
        {business.coverImageUrl ? (
          <Image
            src={business.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            quality={60}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <MediaPlaceholder seed={business.slug} className="size-full" />
        )}

        {/* The heart sits over the photograph rather than in the body, because
            the body is inside the stretched link that makes the whole card
            clickable — a button there would either navigate or have to fight
            the link for the tap. */}
        <div className="absolute right-3 top-3 z-10">
          <LikeButton
            businessId={business.id}
            initialCount={business.likeCount}
            variant="compact"
          />
        </div>

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {business.tier === 'featured' && (
            <Badge variant="featured" className="bg-card/90 backdrop-blur-sm">
              {t('featured')}
            </Badge>
          )}
          {business.isVerified && (
            <Badge variant="verified" className="bg-card/90 backdrop-blur-sm">
              <BadgeCheck className="size-3" aria-hidden />
              {t('verified')}
            </Badge>
          )}
        </div>
      </div>

      <div className={cn('flex flex-1 flex-col', size === 'compact' ? 'p-3.5' : 'p-5')}>
        <h3
          className={cn(
            'font-display font-semibold leading-snug',
            size === 'compact' ? 'line-clamp-2 text-[15px]' : 'text-lg',
          )}
        >
          {/* Stretched link: the whole card is the target, but only the name is
              in the accessibility tree as the link text. */}
          <Link href={{ pathname: '/business/[slug]', params: { slug: business.slug } }}
                className="after:absolute after:inset-0 hover:text-primary">
            {business.name}
          </Link>
        </h3>

        {business.tagline && size !== 'compact' && (
          <p className="mt-1.5 text-sm text-muted-foreground">{business.tagline}</p>
        )}

        <div
          className={cn(
            'flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground',
            size === 'compact' ? 'mt-2 text-xs' : 'mt-3 text-sm',
          )}
        >
          {business.ratingCount > 0 && (
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-warning text-warning" aria-hidden />
              <span className="font-medium text-foreground">
                {business.ratingAvg.toFixed(1)}
              </span>
              <span>({business.ratingCount})</span>
            </span>
          )}
          {business.city && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {business.city}
            </span>
          )}
          {/* Only when there is something to show. A row of zeroes on 2,618
              cards says the site is empty, which is true and not worth
              repeating on every tile. */}
          {business.commentCount > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3.5" aria-hidden />
              <span className="tabular-nums">{business.commentCount}</span>
            </span>
          )}
          {business.photoCount > 0 && (
            <span className="flex items-center gap-1">
              <Camera className="size-3.5" aria-hidden />
              <span className="tabular-nums">{business.photoCount}</span>
            </span>
          )}
          {/* The number that makes a directory comparable. Without it a reader
              scrolling 1,336 listings has no way to tell a budget camping outfit
              from a luxury mobile-camp operator until they have written to both. */}
          {size !== 'compact' && business.dayRateLow !== null && business.dayRateHigh !== null && (
            <span className="flex items-center gap-1 tabular-nums">
              <Wallet className="size-3.5" aria-hidden />
              <span className="font-medium text-foreground">
                {rate(business.dayRateLow)}–{rate(business.dayRateHigh)}
              </span>
              <span>{tCard('perDay')}</span>
            </span>
          )}
        </div>

        {/* Response time is the trust signal operators compete on, and the one
            that makes the premium tier worth buying. */}
        {business.avgResponseMinutes !== null && (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-success">
            <Timer className="size-3.5" aria-hidden />
            {tCard('respondsIn', {
              hours: Math.max(1, Math.round(business.avgResponseMinutes / 60)),
            })}
          </p>
        )}

        {business.isDemo && (
          <Badge variant="demo" className="mt-4 self-start">
            {t('demoData')}
          </Badge>
        )}
      </div>
    </article>
  );
}
