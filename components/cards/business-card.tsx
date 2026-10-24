import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowRight, Award, BadgeCheck, MessageCircle, Star, Timer, UserCheck } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { SaveHeart } from '@/components/wishlist/save-heart';
import { isTopRated, TOP_RATED } from '@/lib/badges';
import { CardImage } from '@/components/cards/card-image';
import type { BusinessCard as BusinessCardData } from '@/lib/queries/businesses';
import { whatsappHref } from '@/lib/contact/whatsapp';
import { cn } from '@/lib/utils';

/**
 * A listing card, Savanna Modern (2026-10):
 *
 *   photograph (or a monogram), the save heart, the trust badges and the
 *   rating chip on it
 *   PLACE · COUNTRY            a small uppercase line, read first
 *   Name  ✓                    extra bold, the verified tick beside it
 *   one line                   the day rate, else the reply time, else the tagline
 *   WhatsApp   Get a quote →   the two ways to reach the operator, pinned to
 *                              the bottom so they line up across a row
 *
 * Nothing is shown that the listing does not have: no rating without reviews,
 * no price without a published day rate, no response time without enquiries.
 */
export async function BusinessCard({
  business,
  className,
  size = 'default',
}: {
  business: BusinessCardData;
  className?: string;
  /**
   * `compact` is the directory size: a 16:9 photograph instead of 4:3 and no
   * tagline, so more rows fit a screen. The price stays: it is the number
   * travellers compare.
   */
  size?: 'default' | 'compact';
}) {
  const t = await getTranslations('common');
  const tCard = await getTranslations('card');
  const locale = await getLocale();

  // Whole units, no decimals: the card is a scan surface.
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: business.dayRateCurrency ?? 'USD',
      maximumFractionDigits: 0,
    }).format(n);

  // The reader's own language for the country name ("Tansania", "Tanzanie"),
  // from the browser's data rather than a hand-kept table.
  let country: string | null = null;
  if (business.countryCode) {
    try {
      country =
        new Intl.DisplayNames([locale], { type: 'region' }).of(business.countryCode.toUpperCase()) ??
        null;
    } catch {
      country = business.countryCode;
    }
  }
  const place = [business.city ?? business.region, country].filter(Boolean).join(' · ');

  const compact = size === 'compact';
  const sizes = '(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw';

  return (
    <article
      className={cn(
        // 24px corners and a soft ink shadow: Savanna Modern's card shape.
        'group relative flex flex-col overflow-hidden rounded-[1.5rem] border bg-card shadow-[0_1px_2px_oklch(0.255_0.045_262/0.04),0_8px_24px_-12px_oklch(0.255_0.045_262/0.18)]',
        'transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        className,
      )}
    >
      <div className={cn('relative overflow-hidden bg-muted', compact ? 'aspect-[16/9]' : 'aspect-[4/3]')}>
        {business.coverImageUrl ? (
          <CardImage
            src={business.coverImageUrl}
            sizes={sizes}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            seed={business.slug}
            region={business.region}
          />
        ) : (
          <Monogram name={business.name} seed={business.slug} />
        )}

        {/* The heart sits over the photograph rather than in the body, because
            the body is inside the stretched link that makes the whole card
            clickable — a button there would fight the link for the tap. */}
        <div className="absolute right-3 top-3 z-10">
          <SaveHeart businessId={business.id} />
        </div>

        {/* Who stands behind the listing. Verified moved to the tick beside
            the name; a claimed listing still says so here. */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 pr-12">
          {isTopRated(business.ratingAvg, business.ratingCount) && (
            <Badge
              className="border-transparent bg-card/95 text-foreground shadow-sm"
              title={tCard('topRatedHelp', { avg: TOP_RATED.minAvg, count: TOP_RATED.minCount })}
            >
              <Award className="size-3 text-warning" aria-hidden />
              {tCard('topRated')}
            </Badge>
          )}
          {business.tier === 'featured' && (
            <Badge variant="featured" className="border-transparent bg-card/95 shadow-sm">
              {t('featured')}
            </Badge>
          )}
          {!business.isVerified && business.isClaimed && (
            <Badge
              variant="outline"
              className="border-transparent bg-card/95 text-xs font-medium shadow-sm"
              title={t('claimedHelp')}
            >
              <UserCheck className="size-3" aria-hidden />
              {t('claimed')}
            </Badge>
          )}
        </div>

        {business.ratingCount > 0 && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 text-[13px] font-bold tabular-nums text-foreground shadow-sm">
            <Star className="size-3.5 fill-warning text-warning" aria-hidden />
            {business.ratingAvg.toFixed(1)}
            <span className="font-medium text-muted-foreground">({business.ratingCount})</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4 sm:px-[1.125rem]">
        {place && (
          <p className="truncate text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">{place}</p>
        )}

        <h3 className="flex items-start gap-1.5 text-[17px] font-extrabold leading-snug tracking-[-0.01em]">
          {/* Stretched link: the whole card is the target, but only the name is
              in the accessibility tree as the link text. */}
          <Link
            href={{ pathname: '/business/[slug]', params: { slug: business.slug } }}
            className="line-clamp-2 after:absolute after:inset-0 hover:text-primary"
          >
            {business.name}
          </Link>
          {business.isVerified && (
            <BadgeCheck
              className="mt-0.5 size-[1.125rem] shrink-0 fill-success text-success-foreground"
              role="img"
              aria-label={t('verified')}
            >
              <title>{t('verifiedHelp')}</title>
            </BadgeCheck>
          )}
        </h3>

        {business.dayRateLow !== null ? (
          <p className="text-sm text-muted-foreground tabular-nums">
            {t('from')}{' '}
            <span className="text-base font-bold text-foreground">{money(business.dayRateLow)}</span>{' '}
            {tCard('perDay')}
          </p>
        ) : business.avgResponseMinutes !== null ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-success">
            <Timer className="size-3.5" aria-hidden />
            {tCard('respondsIn', { hours: Math.max(1, Math.round(business.avgResponseMinutes / 60)) })}
          </p>
        ) : (
          business.tagline &&
          !compact && <p className="line-clamp-1 text-sm text-muted-foreground">{business.tagline}</p>
        )}

        {/* The two ways to reach the operator, above the stretched link (z-10)
            so a tap opens them rather than the listing. WhatsApp goes through
            the tracked route, which counts it as a contact. */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          {business.whatsapp ? (
            <a
              href={whatsappHref(business.id, 'card', locale)}
              target="_blank"
              rel="nofollow noopener noreferrer"
              aria-label={tCard('whatsappLabel', { name: business.name })}
              className="relative z-10 inline-flex h-10 items-center gap-1.5 rounded-full bg-success/12 px-3.5 text-sm font-bold text-success transition-colors hover:bg-success/20"
            >
              <MessageCircle className="size-4" aria-hidden />
              {tCard('whatsapp')}
            </a>
          ) : (
            <span />
          )}
          <Link
            href={{ pathname: '/request-quote', query: { business: business.slug } }}
            className="relative z-10 inline-flex h-10 items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            {tCard('getQuote')}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        {business.isDemo && (
          <Badge variant="demo" className="mt-2 self-start">
            {t('demoData')}
          </Badge>
        )}
      </div>
    </article>
  );
}

/**
 * For a listing without a photograph, which is most of them: a soft gradient
 * in one of five brand-adjacent pairs, picked steadily from the slug, with the
 * business's initials on a white tile. It says "this is a real business that
 * has not added photos yet" where generic landscape art said nothing.
 */
const MONOGRAM_TONES = [
  'from-[oklch(0.90_0.05_255)] to-[oklch(0.62_0.13_258)]',
  'from-[oklch(0.90_0.06_50)] to-[oklch(0.70_0.14_40)]',
  'from-[oklch(0.91_0.05_155)] to-[oklch(0.62_0.11_158)]',
  'from-[oklch(0.92_0.06_85)] to-[oklch(0.74_0.13_75)]',
  'from-[oklch(0.90_0.04_300)] to-[oklch(0.62_0.10_300)]',
];

function Monogram({ name, seed }: { name: string; seed: string }) {
  const initials =
    name
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '•';
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const tone = MONOGRAM_TONES[hash % MONOGRAM_TONES.length];

  return (
    <div className={cn('flex size-full items-center justify-center bg-gradient-to-br', tone)} aria-hidden>
      <span className="flex size-[4.75rem] items-center justify-center rounded-[1.375rem] bg-white/92 text-[1.75rem] font-extrabold tracking-[-0.02em] text-[oklch(0.255_0.045_262)] shadow-[0_10px_30px_-10px_rgb(0_0_0/0.35)]">
        {initials}
      </span>
    </div>
  );
}
