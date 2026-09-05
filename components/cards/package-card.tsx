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

/**
 * A package, as a ticket rather than a listing.
 *
 * It shared a wrapper string character for character with the business and
 * guide cards, so a trip you could book and a company you could ring were the
 * same object on screen. Three things separate it now, none of which costs
 * height — the packages grid is already the tallest thing on a business page,
 * and "reduce vertical scrolling without reducing content" is a standing
 * constraint here.
 *
 * A Flame rule down the left edge. The only card with a coloured edge, and the
 * colour is the one this site reserves for "you can act on this".
 *
 * The itinerary as a route line rather than a string joined with middots. A
 * trip is a sequence of places, and dots on a rule say sequence where
 * "Serengeti · Ngorongoro · Manyara" says list.
 *
 * The price on its own band of the warm paper stock, so the number a shopper
 * is looking for is the one thing physically separated from the prose.
 */
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
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm',
        'transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md',
        // The edge. Drawn rather than bordered so it survives the overflow clip.
        'before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-1 before:bg-accent',
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
          <div className="mt-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              {tCard('visits')}
            </p>
            {/* Stops on a line. Capped at three with a remainder, because a
                fourteen-day trip lists eight places and a card is a decision,
                not an itinerary. */}
            <ol className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
              {pkg.visits.slice(0, 3).map((v, i) => (
                <li key={v} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden className="h-px w-3 bg-border" />}
                  <span aria-hidden className="size-1.5 rounded-full bg-primary/70" />
                  <span className="truncate">{v}</span>
                </li>
              ))}
              {pkg.visits.length > 3 && (
                <li className="flex items-center gap-1.5">
                  <span aria-hidden className="h-px w-3 bg-border" />
                  <span className="tabular-nums">+{pkg.visits.length - 3}</span>
                </li>
              )}
            </ol>
          </div>
        )}
      </div>

      {/* The price, on its own stock. Separated from the prose because it is
          the one number the reader came for. */}
      <div className="mt-auto flex items-end justify-between gap-3 border-t bg-muted px-5 py-3.5">
        {pkg.priceFrom !== null ? (
          <p className="text-sm text-muted-foreground">
            {t('from')}{' '}
            <span className="font-display text-xl font-semibold tabular-nums text-foreground">
              {formatPrice(pkg.priceFrom, pkg.currency, locale)}
            </span>
            {pkg.priceUnit === 'per_person' && <span className="ml-1 text-xs">{t('perPerson')}</span>}
          </p>
        ) : (
          <span />
        )}
        {pkg.isDemo && <Badge variant="demo">{t('demoData')}</Badge>}
      </div>
    </article>
  );
}
