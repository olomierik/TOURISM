import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Clock } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { MediaPlaceholder } from '@/components/cards/media-placeholder';
import type { GuideCard as GuideCardData } from '@/lib/queries/guides';
import { cn } from '@/lib/utils';

/**
 * A guide, as a page rather than a product.
 *
 * This used to share a wrapper string character for character with the business
 * and package cards — same radius, same border, same fill, same hover shadow,
 * differing only in aspect ratio and padding. Three different kinds of thing
 * wearing one costume, so a grid of them read as inventory whatever it held.
 *
 * The strongest and cheapest way to make an article look like an article is to
 * take the chrome away. No border, no card fill, no shadow: a rule, a thumbnail
 * and type. It is the only one of the four that is not a box, which is exactly
 * why it is legible as something else at a glance.
 */
export async function GuideCard({
  guide,
  className,
}: {
  guide: GuideCardData;
  className?: string;
}) {
  const t = await getTranslations('common');
  const tCard = await getTranslations('card');

  return (
    <article className={cn('group relative flex flex-col', className)}>
      {/* The rule does the work the border used to, at a fraction of the weight,
          and it darkens on hover so the whole card still answers the cursor. */}
      <span
        aria-hidden
        className="block h-px w-full bg-border transition-colors duration-200 group-hover:bg-primary"
      />

      <div className="relative mt-4 aspect-[3/2] overflow-hidden rounded-lg bg-muted">
        {guide.coverImageUrl ? (
          <Image
            src={guide.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            quality={60}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <MediaPlaceholder seed={guide.slug} className="size-full" />
        )}
      </div>

      <h3 className="mt-4 font-display text-xl font-semibold leading-snug">
        <Link
          href={{ pathname: '/guides/[slug]', params: { slug: guide.slug } }}
          className="after:absolute after:inset-0 hover:text-primary"
        >
          {guide.title}
        </Link>
      </h3>

      {/* Two lines, not three. The brief asks for a two-line excerpt and it
          is right: a card is a decision about whether to read, and the third
          line is the one that turns a grid of guides into a wall of prose. */}
      {guide.excerpt && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {guide.excerpt}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        {guide.readingMinutes && (
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden />
            {tCard('readingMinutes', { minutes: guide.readingMinutes })}
          </span>
        )}
        {guide.isDemo && <Badge variant="demo">{t('demoData')}</Badge>}
      </div>
    </article>
  );
}
