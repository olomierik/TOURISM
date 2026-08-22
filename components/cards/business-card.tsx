import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { BadgeCheck, MapPin, Star, Timer } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { MediaPlaceholder } from '@/components/cards/media-placeholder';
import type { BusinessCard as BusinessCardData } from '@/lib/queries/businesses';
import { cn } from '@/lib/utils';

export async function BusinessCard({
  business,
  className,
}: {
  business: BusinessCardData;
  className?: string;
}) {
  const t = await getTranslations('common');
  const tCard = await getTranslations('card');

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-md',
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {business.coverImageUrl ? (
          <Image
            src={business.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <MediaPlaceholder seed={business.slug} className="size-full" />
        )}

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

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold leading-snug">
          {/* Stretched link: the whole card is the target, but only the name is
              in the accessibility tree as the link text. */}
          <Link href={{ pathname: '/business/[slug]', params: { slug: business.slug } }}
                className="after:absolute after:inset-0 hover:text-primary">
            {business.name}
          </Link>
        </h3>

        {business.tagline && (
          <p className="mt-1.5 text-sm text-muted-foreground">{business.tagline}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
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
