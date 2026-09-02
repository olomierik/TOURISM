import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Clock } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { MediaPlaceholder } from '@/components/cards/media-placeholder';
import type { GuideCard as GuideCardData } from '@/lib/queries/guides';
import { cn } from '@/lib/utils';

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
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-md',
        className,
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
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

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-semibold leading-snug">
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

        <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-xs text-muted-foreground">
          {guide.readingMinutes && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden />
              {tCard('readingMinutes', { minutes: guide.readingMinutes })}
            </span>
          )}
          {guide.isDemo && <Badge variant="demo">{t('demoData')}</Badge>}
        </div>
      </div>
    </article>
  );
}
