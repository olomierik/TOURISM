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
  size?: 'default' | 'large';
}) {
  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl',
        size === 'large' ? 'aspect-[4/5] sm:aspect-[3/4]' : 'aspect-[4/3]',
        className,
      )}
    >
      {destination.coverImageUrl ? (
        <Image
          src={destination.coverImageUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          quality={60}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <MediaPlaceholder seed={destination.key} className="absolute inset-0" />
      )}

      {/* Eased scrim rather than a flat black overlay: keeps the imagery readable
          while guaranteeing contrast for the label sitting on top of it. */}
      <div className="overlay-scrim absolute inset-0" />

      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="font-display text-xl font-semibold text-white">
          <Link
            href={{ pathname: '/destinations/[slug]', params: { slug: destination.slug } }}
            className="after:absolute after:inset-0"
          >
            {destination.name}
          </Link>
        </h3>
        {destination.summary && (
          <p className="mt-1.5 line-clamp-2 text-sm text-white/80">{destination.summary}</p>
        )}
      </div>

      <ArrowUpRight
        className="absolute right-4 top-4 size-5 text-white/0 transition-all duration-300 group-hover:text-white/90"
        aria-hidden
      />
    </article>
  );
}
