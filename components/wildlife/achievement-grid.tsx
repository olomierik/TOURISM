import { useTranslations } from 'next-intl';
import {
  Award,
  Binoculars,
  Bird,
  Cat,
  Crown,
  Footprints,
  Gem,
  Lock,
  PawPrint,
  Sparkles,
  Turtle,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Achievement, AchievementId } from '@/lib/wildlife/achievements';

const ICON: Record<AchievementId, LucideIcon> = {
  firstSighting: Sparkles,
  bigFive: Crown,
  bigCats: Cat,
  species10: Binoculars,
  species25: Footprints,
  species50: Award,
  mammals15: PawPrint,
  birds15: Bird,
  reptiles5: Turtle,
  rareFind: Gem,
};

export function AchievementGrid({
  achievements,
  limit,
}: {
  achievements: Achievement[];
  /** Show only the first n (earned first), for summaries. */
  limit?: number;
}) {
  const t = useTranslations('wildlife');
  const ordered = [...achievements].sort((a, b) => Number(b.done) - Number(a.done));
  const shown = limit ? ordered.slice(0, limit) : ordered;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {shown.map((a) => {
        const Icon = a.done ? ICON[a.id] : Lock;
        const pct = Math.round((a.current / a.target) * 100);
        return (
          <li
            key={a.id}
            className={cn(
              'flex flex-col items-center rounded-lg border p-4 text-center',
              a.done ? 'border-gold/50 bg-gold/10' : 'bg-surface',
            )}
          >
            <span
              className={cn(
                'flex size-12 items-center justify-center rounded-full',
                a.done ? 'bg-gold text-background' : 'bg-surface-sunken text-muted-foreground',
              )}
            >
              <Icon className="size-6" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-3 font-display text-heading-sm font-semibold leading-tight text-foreground">
              {t(`achievements.${a.id}.title`)}
            </p>
            <p className="mt-1 text-caption text-muted-foreground">{t(`achievements.${a.id}.body`)}</p>
            <div className="mt-auto w-full pt-3">
              <div
                className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-sunken"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={a.target}
                aria-valuenow={a.current}
                aria-label={t(`achievements.${a.id}.title`)}
              >
                <div
                  className={cn('h-full rounded-pill', a.done ? 'bg-gold' : 'bg-primary')}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-caption font-semibold tabular-nums text-muted-foreground">
                {a.done ? t('diary.earned') : t('diary.progress', { current: a.current, target: a.target })}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
