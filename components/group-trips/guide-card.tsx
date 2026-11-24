import { getTranslations } from 'next-intl/server';
import { BadgeCheck, Languages, MapPin, Star, Users } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import type { TourGuideProfile } from '@/lib/tour-guides/queries';

/** A verified local guide, as a group organiser compares them. */
export async function GuideCard({ guide }: { guide: TourGuideProfile }) {
  const t = await getTranslations('tourGuides');
  return (
    <Link
      href={{ pathname: '/business/[slug]', params: { slug: guide.slug } }}
      className="press flex h-full flex-col rounded-2xl border bg-card p-4 transition-colors hover:border-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug">{guide.name}</h3>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-caption font-medium text-success">
          <BadgeCheck className="size-3.5" aria-hidden />
          {t(`kind.${guide.guideKind}Short`)}
        </span>
      </div>
      {guide.city && (
        <p className="mt-1 flex items-center gap-1 text-body-sm text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden />
          {[guide.city, ...guide.areas.slice(0, 2)].filter(Boolean).join(' · ')}
        </p>
      )}
      {guide.languages.length > 0 && (
        <p className="mt-1 flex items-center gap-1 text-body-sm text-muted-foreground">
          <Languages className="size-3.5" aria-hidden />
          {guide.languages.slice(0, 4).map((l) => t(`language.${l}`)).join(', ')}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {guide.audiences.map((a) => (
          <span key={a} className="rounded-full bg-muted px-2 py-0.5 text-caption">
            {t(`audience.${a}`)}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-body-sm">
        <span className="font-semibold">
          {guide.dayRate ? t('perDay', { price: `${guide.dayRateCurrency === 'USD' ? '$' : 'TSh '}${guide.dayRate.toLocaleString('en-US')}` }) : t('askPrice')}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {guide.maxGroup && (
            <span className="flex items-center gap-0.5">
              <Users className="size-3.5" aria-hidden />
              {guide.maxGroup}
            </span>
          )}
          {guide.ratingCount > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="size-3.5 fill-warning text-warning" aria-hidden />
              {guide.ratingAvg.toFixed(1)}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}
