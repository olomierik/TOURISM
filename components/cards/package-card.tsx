import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { BadgeCheck, CalendarDays, MapPin } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { MediaPlaceholder } from '@/components/cards/media-placeholder';
import { formatPrice } from '@/lib/format';
import type { PackageCard as PackageCardData } from '@/lib/queries/packages';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export async function PackageCard({
  pkg,
  locale,
  className,
}: {
  pkg: PackageCardData;
  locale: Locale;
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
        {pkg.coverImageUrl ? (
          <Image
            src={pkg.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            quality={60}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <MediaPlaceholder seed={pkg.slug} className="size-full" />
        )}
        {pkg.isFeatured && (
          <Badge variant="featured" className="absolute left-3 top-3 bg-card/90 backdrop-blur-sm">
            {t('featured')}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold leading-snug">
          {/*
            Linked in the locale the text is written in, not the locale of the
            page. An operator writes a tour once; the detail page exists only
            where that text exists, so linking with the page's locale would send
            a German reader to a 404 for an English-written trip.
          */}
          <Link
            // Only when it differs. next-intl forces the prefix whenever the
            // prop is passed, so locale="en" on an English page emits
            // /en/packages/... and then 307s to /packages/... — a redirect on
            // every card for the case that will be most of them.
            locale={pkg.contentLocale === locale ? undefined : pkg.contentLocale}
            href={{ pathname: '/packages/[slug]', params: { slug: pkg.slug } }}
            className="after:absolute after:inset-0 hover:text-primary"
          >
            {pkg.title}
          </Link>
        </h3>

        {pkg.summary && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{pkg.summary}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          {pkg.durationDays && (
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden />
              {tCard('durationDays', { days: pkg.durationDays })}
            </span>
          )}
          {pkg.business && (
            <span className="flex min-w-0 items-center gap-1">
              {pkg.business.isVerified && (
                <BadgeCheck className="size-3.5 shrink-0 text-success" aria-hidden />
              )}
              <span className="truncate">{pkg.business.name}</span>
            </span>
          )}
        </div>

        {/*
          Where the trip actually goes. The line a shopper reads before the
          price, because "6 days" and "$2,335" mean nothing until you know
          whether it includes the Serengeti. Empty for a trip attached to
          nothing, which was every trip until the form learned to ask.
        */}
        {pkg.visits.length > 0 && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span className="line-clamp-2">
              <span className="font-medium text-foreground">{tCard('visits')}</span>{' '}
              {pkg.visits.join(' · ')}
            </span>
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          {pkg.priceFrom !== null && (
            <p className="text-sm text-muted-foreground">
              {t('from')}{' '}
              <span className="font-display text-xl font-semibold text-foreground">
                {formatPrice(pkg.priceFrom, pkg.currency, locale)}
              </span>
              {pkg.priceUnit === 'per_person' && (
                <span className="ml-1 text-xs">{t('perPerson')}</span>
              )}
            </p>
          )}
          {pkg.isDemo && <Badge variant="demo">{t('demoData')}</Badge>}
        </div>
      </div>
    </article>
  );
}
