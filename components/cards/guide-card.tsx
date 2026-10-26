import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import type { GuideCard as GuideCardData } from '@/lib/queries/guides';
import { cn } from '@/lib/utils';

/**
 * GuideCard — design.md §6.5.
 *
 * "overline topic · read time; title in heading-sm (2 lines); 1-line summary;
 * **optional** 16:9 photo."
 *
 * Optional is the operative word, and it is why this card no longer draws a
 * media slot when there is no photograph. §5.1.5 says a guide hero is either a
 * real licensed photo with credit or no hero at all — a fallback tile above an
 * article is a frame around nothing, where a listing's fallback at least says
 * which category the listing is in.
 *
 * The title is two lines here against one on a listing (§6.5), because a
 * headline is the whole proposition of an article and truncating it mid-clause
 * loses the reason to read.
 */
export async function GuideCard({
  guide,
  className,
  featured = false,
}: {
  guide: GuideCardData;
  className?: string;
  /** §7.12: the guides index leads with one large card. */
  featured?: boolean;
}) {
  const t = await getTranslations('common');
  const tCard = await getTranslations('card');

  const overline = [guide.topic, guide.readingMinutes && tCard('readingMinutes', { minutes: guide.readingMinutes })]
    .filter(Boolean)
    .join(' · ');

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border bg-surface shadow-[var(--elev-xs)]',
        'transition-shadow duration-[var(--dur-base)] ease-[var(--ease-out)] hover:shadow-[var(--elev-md)]',
        className,
      )}
    >
      {guide.coverImageUrl ? (
        <div className={cn('relative overflow-hidden bg-surface-sunken', featured ? 'aspect-[2/1]' : 'aspect-video')}>
          <Image
            src={guide.coverImageUrl}
            alt=""
            fill
            sizes={featured ? '(min-width:1024px) 66vw, 100vw' : '(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw'}
            quality={65}
            className="object-cover"
          />
        </div>
      ) : null}

      <div className={cn('flex flex-1 flex-col', featured ? 'p-5 sm:p-6' : 'p-4')}>
        {overline && (
          <p className="text-overline font-semibold uppercase text-muted-foreground">{overline}</p>
        )}

        <h3
          className={cn(
            'mt-1 font-display',
            featured ? 'text-heading-lg' : 'text-heading-sm',
          )}
        >
          <Link
            href={{ pathname: '/guides/[slug]', params: { slug: guide.slug } }}
            title={guide.title}
            className="line-clamp-2 after:absolute after:inset-0 hover:text-primary"
          >
            {guide.title}
          </Link>
        </h3>

        {/* One line (§6.5). The second was the line that turned a grid of
            guides into a wall of prose. */}
        {guide.excerpt && (
          <p className="mt-1.5 line-clamp-1 text-body-sm text-muted-foreground">{guide.excerpt}</p>
        )}

        {guide.isDemo && (
          <div className="mt-auto pt-3">
            <Badge variant="demo">{t('demoData')}</Badge>
          </div>
        )}
      </div>
    </article>
  );
}
