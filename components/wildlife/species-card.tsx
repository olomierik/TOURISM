import Image from 'next/image';
import { Check, Crown, PawPrint, Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { SpeciesCardData } from '@/lib/wildlife/species';
import { IucnBadge } from './iucn-badge';

/**
 * One animal in the guide's grid. Presentational: what it shows comes from the
 * static species file, plus whether this traveller has logged it.
 */
export function SpeciesCard({
  species,
  seen = false,
  priority = false,
}: {
  species: SpeciesCardData;
  seen?: boolean;
  priority?: boolean;
}) {
  const t = useTranslations('wildlife');

  return (
    <Link
      href={{ pathname: '/wildlife/[slug]', params: { slug: species.slug } }}
      className="card-surface-interactive group flex h-full flex-col overflow-hidden"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
        {species.image ? (
          <Image
            src={species.image}
            alt={species.name}
            fill
            sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw"
            quality={65}
            // Straight from Wikimedia's CDN, already scaled: routing a hundred
            // Commons files through our optimizer only gets its server rate-limited.
            unoptimized
            priority={priority}
            className="object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <PawPrint className="size-10" strokeWidth={1.25} aria-hidden />
          </div>
        )}

        <div className="absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-1.5">
          {species.bigFive ? (
            <span className="inline-flex items-center gap-1 rounded-pill bg-gold px-2 py-0.5 text-overline font-semibold text-background shadow-sm">
              <Crown className="size-3" aria-hidden />
              {t('bigFive')}
            </span>
          ) : (
            <span />
          )}
          {seen && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-success px-2 py-0.5 text-overline font-semibold text-success-foreground shadow-sm">
              <Check className="size-3" aria-hidden />
              {t('seen')}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-display text-heading-sm font-semibold leading-tight text-foreground">
          {species.name}
        </h3>
        <p className="text-body-sm italic text-muted-foreground">{species.scientific}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          <IucnBadge code={species.iucn} compact />
          <span
            className={cn(
              'rounded-pill border px-2 py-0.5 text-caption font-medium',
              species.rarity === 'rare' ? 'border-gold/60 text-foreground' : 'text-muted-foreground',
            )}
          >
            {t(`rarity.${species.rarity}`)}
          </span>
          {species.hasCall && (
            <Volume2 className="ml-auto size-4 text-muted-foreground" aria-label={t('withCall')} />
          )}
        </div>
      </div>
    </Link>
  );
}
