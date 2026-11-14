import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { TripIntentValue } from '@/components/directory/intent-chips';

import { TRIP_ACTIVITIES, type TripActivityValue } from '@/lib/taxonomy/trip';

// Re-exported rather than moved outright: the list now lives in lib/taxonomy/trip
// so the dashboard's save action can read it without importing a client
// component, and the directory keeps importing it from here as it always has.
export {
  TRIP_ACTIVITIES,
  isTripActivity,
  type TripActivityValue,
} from '@/lib/taxonomy/trip';

/**
 * Which activities belong under which trip type, for the second chip row.
 *
 * The two levels the owner asked for (2026-11-09): "the activities they cover,
 * and sub-activities". The trip type (business_intents) is the first level and
 * already had its chip row; these are the specific things an operator runs
 * (business_activities), shown under it. With a trip type chosen, only the
 * activities that make sense for it are offered — nobody climbing Kilimanjaro
 * is looking for a snorkelling trip — and with none chosen, all nine are.
 *
 * This is a presentation grouping, not a constraint in the data: an activity
 * filter is applied on its own and never implies the trip type.
 */
const BY_INTENT: Record<TripIntentValue, readonly TripActivityValue[]> = {
  safari: ['walking_safaris', 'balloon', 'bird_watching', 'photography', 'day_trips', 'cultural_tours'],
  mountain: ['day_trips', 'photography', 'cultural_tours'],
  beach: ['snorkeling', 'diving', 'spice_tours', 'day_trips', 'cultural_tours'],
  combo: TRIP_ACTIVITIES,
};

export function ActivityChips({
  intent,
  current,
  params,
  className,
}: {
  intent?: TripIntentValue;
  current?: TripActivityValue;
  /** The directory's current query string, so a chip keeps the rest of it. */
  params: Record<string, string | string[] | undefined>;
  className?: string;
}) {
  const t = useTranslations('business.activities');
  const tDir = useTranslations('directory');

  const shown = intent ? BY_INTENT[intent] : TRIP_ACTIVITIES;
  // A chosen activity stays visible even if the trip type changed under it, so
  // the filter in force is always on screen and can be cleared.
  const list = current && !shown.includes(current) ? [current, ...shown] : shown;

  const hrefFor = (activity: TripActivityValue | null) => {
    const q: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      // `page` dropped for the same reason as in IntentChips.
      if (k === 'activity' || k === 'page') continue;
      const one = Array.isArray(v) ? v[0] : v;
      if (one) q[k] = one;
    }
    if (activity) q.activity = activity;
    return { pathname: '/directory' as const, query: q };
  };

  const chip = (active: boolean) =>
    cn(
      'shrink-0 snap-start whitespace-nowrap rounded-full border px-3 py-1 text-[0.8125rem] transition-colors',
      active
        ? 'border-primary bg-primary-subtle font-semibold text-primary'
        : 'border-border bg-surface text-muted-foreground hover:border-primary hover:text-foreground',
    );

  return (
    <nav aria-label={t('title')} className={cn('flex items-center gap-2', className)}>
      <span className="shrink-0 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
        {t('title')}
      </span>
      {/* One scrolling line on a phone, wrapping from sm: nine chips would
          otherwise cost four rows above the results. */}
      <div className="scrollbar-none -mr-5 flex min-w-0 snap-x scroll-pr-5 gap-1.5 overflow-x-auto pr-5 sm:mr-0 sm:flex-wrap sm:overflow-visible sm:pr-0">
        <Link href={hrefFor(null)} aria-current={current ? undefined : 'true'} className={chip(!current)}>
          {tDir('allActivities')}
        </Link>
        {list.map((a) => (
          <Link key={a} href={hrefFor(a)} aria-current={current === a ? 'true' : undefined} className={chip(current === a)}>
            {t(a)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
