import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { TRIP_INTENTS, type TripIntentValue } from '@/lib/taxonomy/trip';

// Re-exported rather than moved outright: the list now lives in lib/taxonomy/trip
// so the dashboard's save action can read it without importing a client
// component, and the directory keeps importing it from here as it always has.
export { TRIP_INTENTS, isTripIntent, type TripIntentValue } from '@/lib/taxonomy/trip';

/**
 * "What are you here for" — above the results, not inside the filter drawer.
 *
 * The directory's filters are all attributes of a listing: category, region,
 * rating, price. This one is an attribute of the visitor, and it is the first
 * thing they know and the last thing the page asked them. A traveller who came
 * to climb Kilimanjaro should not have to open a drawer and work out that the
 * category they want is called "safaris".
 *
 * A row of links rather than a client-side control: each one is a real URL that
 * can be shared, linked to and read by a crawler, and it keeps every other
 * filter the visitor has already set. `page` is dropped on purpose — changing
 * the intent changes the result set, and page 7 of the old one means nothing.
 */
export function IntentChips({
  current,
  params,
  className,
}: {
  current?: TripIntentValue;
  /** The directory's current query string, so a chip preserves the rest of it. */
  params: Record<string, string | string[] | undefined>;
  className?: string;
}) {
  const t = useTranslations('business.intents');
  const tDir = useTranslations('directory');

  const hrefFor = (intent: TripIntentValue | null) => {
    const q: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (k === 'intent' || k === 'page') continue;
      const one = Array.isArray(v) ? v[0] : v;
      if (one) q[k] = one;
    }
    if (intent) q.intent = intent;
    return { pathname: '/directory' as const, query: q };
  };

  return (
    <nav aria-label={t('title')} className={cn('flex flex-wrap gap-2', className)}>
      <Link
        href={hrefFor(null)}
        aria-current={current ? undefined : 'true'}
        className={cn(
          'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
          current
            ? 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
            : 'border-primary bg-primary text-primary-foreground',
        )}
      >
        {tDir('allTrips')}
      </Link>
      {TRIP_INTENTS.map((i) => (
        <Link
          key={i}
          href={hrefFor(i)}
          aria-current={current === i ? 'true' : undefined}
          className={cn(
            'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
            current === i
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:border-primary hover:text-foreground',
          )}
        >
          {t(i)}
        </Link>
      ))}
    </nav>
  );
}
