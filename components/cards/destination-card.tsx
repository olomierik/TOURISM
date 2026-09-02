import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { MediaPlaceholder } from '@/components/cards/media-placeholder';
import type { DestinationSummary } from '@/lib/queries/taxonomy';
import { cn } from '@/lib/utils';

export function DestinationCard({
  destination,
  className,
  size = 'default',
}: {
  destination: DestinationSummary;
  className?: string;
  /**
   * `compact` is the grid and rail size: 3:2 and title only, which brings a
   * card from 294px to roughly 200px and lets four sit across a desktop row
   * instead of three. The summary is not lost — it is on the destination page,
   * which is where somebody who wants it is going anyway, and two lines of it
   * on 46 tiles is most of why this page ran to seven screens.
   */
  size?: 'default' | 'large' | 'compact' | 'feature';
}) {
  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl',
        size === 'large'
          ? 'aspect-[4/5] sm:aspect-[3/4]'
          : size === 'compact'
            ? 'aspect-[3/2]'
            : // `feature` takes its height from the grid rows it spans rather
              // than from a ratio, so it ends level with the compact tiles
              // beside it instead of dictating the row height itself.
              size === 'feature'
              ? 'aspect-[3/2] sm:aspect-auto sm:h-full'
              : 'aspect-[4/3]',
        className,
      )}
    >
      {destination.coverImageUrl ? (
        <Image
          src={destination.coverImageUrl}
          alt=""
          fill
          sizes={
            size === 'compact'
              ? '(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 45vw'
              : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
          }
          quality={60}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <MediaPlaceholder seed={destination.key} className="absolute inset-0" />
      )}

      {/* Eased scrim rather than a flat black overlay: keeps the imagery readable
          while guaranteeing contrast for the label sitting on top of it. */}
      <div className="overlay-scrim absolute inset-0" />

      <div className={cn('absolute inset-x-0 bottom-0', size === 'compact' ? 'p-3.5' : 'p-5')}>
        <h3
          className={cn(
            'font-display font-semibold text-white',
            size === 'compact'
              ? 'text-base leading-snug'
              : size === 'feature'
                ? 'text-2xl sm:text-3xl'
                : 'text-xl',
          )}
        >
          <Link
            href={{ pathname: '/destinations/[slug]', params: { slug: destination.slug } }}
            className="after:absolute after:inset-0"
          >
            {destination.name}
          </Link>
        </h3>
        {destination.summary && size !== 'compact' && (
          <p className="mt-1.5 line-clamp-2 text-sm text-white/80">{destination.summary}</p>
        )}

      </div>

      <ArrowUpRight
        className={cn(
          'absolute text-white/0 transition-all duration-300 group-hover:text-white/90',
          size === 'compact' ? 'right-3 top-3 size-4' : 'right-4 top-4 size-5',
        )}
        aria-hidden
      />
    </article>
  );
}
