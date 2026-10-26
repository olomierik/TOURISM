import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import { CalendarCheck } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { MediaFallback } from '@/components/media/media-fallback';
import { monthRangeLabel } from '@/lib/months';
import type { DestinationSummary } from '@/lib/queries/taxonomy';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

/**
 * DestinationCard — design.md §6.5.
 *
 * "4:5 media with a bottom scrim (solid rgb(14 23 38 / 0.55) band behind the
 * text, **not a gradient wash**). Name in display-lg white, best months in
 * body-sm, overline category."
 *
 * The scrim is the change. A four-stop eased gradient was the previous
 * approach and it is the better-looking one on a good photograph — but it is
 * also the reason the label's contrast depended on what the photograph happened
 * to show at that height. A pale sky behind white type is a contrast failure
 * nobody can see in review because it only happens on some images. A solid band
 * at a fixed opacity makes the ratio a property of the component instead of a
 * property of the picture, which is what §5 means by designing for the media
 * you actually have.
 *
 * Best months is new and is the point of the card: §7.1.5 asks for six
 * destinations "with best months", because a photograph of a park is a nice
 * picture and "Serengeti · Jun–Oct" is a plan.
 */
export async function DestinationCard({
  destination,
  className,
  size = 'default',
}: {
  destination: DestinationSummary;
  className?: string;
  /**
   * `feature` spans 2x2 in the bento (§6.5) and takes its height from the grid
   * rather than a ratio, so it finishes level with the tiles beside it.
   * `tile` is the same inside a fixed-row grid. `compact` is the index grid.
   */
  size?: 'default' | 'large' | 'compact' | 'feature' | 'tile';
}) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('destination');
  const months = monthRangeLabel(destination.bestMonths ?? [], locale);
  const fromGrid = size === 'feature' || size === 'tile';
  const big = size === 'feature' || size === 'large';

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-lg',
        fromGrid
          ? 'h-full'
          : size === 'compact'
            ? 'aspect-[3/2]'
            : // §6.5: 4:5. A portrait frame is what makes a destination read as
              // a place rather than a banner, and it is the ratio the
              // homepage's horizontal scroll-snap strip is sized for.
              'aspect-[4/5]',
        className,
      )}
    >
      {destination.coverImageUrl ? (
        <Image
          src={destination.coverImageUrl}
          alt=""
          fill
          // §5.3 destination-card row.
          sizes={
            size === 'compact'
              ? '(min-width:1280px) 25vw, (min-width:640px) 33vw, 45vw'
              : '(min-width:1280px) 300px, (min-width:1024px) 33vw, (min-width:640px) 50vw, 80vw'
          }
          quality={65}
          className="object-cover"
        />
      ) : (
        <MediaFallback
          icon="MapPin"
          label={null}
          size={big ? 'lg' : 'md'}
          className="absolute inset-0"
        />
      )}

      {/* The solid band §6.5 asks for. Ink at 55%, on the ink hue rather than
          pure black, so it sits in the same neutral family as the rest of the
          page instead of punching a hole in it. */}
      <div className="absolute inset-x-0 bottom-0 bg-[oklch(0.17_0.03_262/0.55)] backdrop-blur-[2px]">
        <div className={cn(size === 'compact' ? 'p-3' : big ? 'p-5 sm:p-6' : 'p-4')}>
          {/* §6.5 asks for an overline category here — "National park",
              "Island". The destinations table has no such column: it carries a
              key, a country and a region id, and nothing that says what kind of
              place this is. Rather than print the name twice or guess a kind
              from the slug, the line is left out until the data exists. */}
          <h3
            className={cn(
              'font-display text-white',
              big
                ? 'text-display-lg'
                : size === 'compact'
                  ? 'line-clamp-2 text-heading-sm'
                  : 'line-clamp-2 text-heading-md',
            )}
          >
            <Link
              href={{ pathname: '/destinations/[slug]', params: { slug: destination.slug } }}
              className="after:absolute after:inset-0"
            >
              {destination.name}
            </Link>
          </h3>
          {months && (
            <p className="mt-1 flex items-center gap-1.5 text-body-sm font-medium text-white/85">
              <CalendarCheck className="size-3.5 shrink-0" aria-hidden />
              {t('bestMonths', { months })}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
