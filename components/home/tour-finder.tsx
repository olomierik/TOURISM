'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

/**
 * Where and how long, with a button that says how many tours match before
 * it is pressed — SafariBookings' "Show 5,912 Tours".
 *
 * The count is the point. It tells a visitor the search will not come back
 * empty, and it is computed here from the facts the server passed in, so it
 * changes as the selects change with no request in between.
 *
 * The length bands are the tour search's own (app/[locale]/packages), so
 * the number on the button is the number the next page shows.
 *
 * When nothing matches, the button stops offering an empty page and offers
 * the quote form instead: operators whose tours are not written up here can
 * still answer a description of the trip.
 */

const BANDS = {
  '1-3': [1, 3],
  '4-6': [4, 6],
  '7-10': [7, 10],
  '11+': [11, Infinity],
} as const;
type Band = keyof typeof BANDS;

export function TourFinder({
  tours,
  destinations,
}: {
  tours: Array<{ destinationIds: string[]; days: number | null }>;
  /** Only places some tour visits; offering the rest would offer zero. */
  destinations: Array<{ id: string; slug: string; name: string }>;
}) {
  const t = useTranslations('tours');
  const [where, setWhere] = useState('');
  const [length, setLength] = useState<Band | ''>('');

  const count = useMemo(() => {
    const dest = destinations.find((d) => d.slug === where);
    const band = length ? BANDS[length] : null;
    return tours.filter(
      (tour) =>
        (!dest || tour.destinationIds.includes(dest.id)) &&
        (!band || (tour.days !== null && tour.days >= band[0] && tour.days <= band[1])),
    ).length;
  }, [tours, destinations, where, length]);

  const query: Record<string, string> = {};
  if (where) query.where = where;
  if (length) query.length = length;

  return (
    <div className="grid gap-3 rounded-2xl border bg-surface p-4 shadow-[var(--elev-xs)] sm:grid-cols-[1.4fr_1fr_auto] sm:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="finder-where">{t('whereLabel')}</Label>
        <Select id="finder-where" value={where} onChange={(e) => setWhere(e.target.value)}>
          <option value="">{t('anywhere')}</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.slug}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="finder-length">{t('lengthLabel')}</Label>
        <Select id="finder-length" value={length} onChange={(e) => setLength(e.target.value as Band | '')}>
          <option value="">{t('anyLength')}</option>
          {(Object.keys(BANDS) as Band[]).map((b) => (
            <option key={b} value={b}>
              {t('days', { range: b.replace('-', '–') })}
            </option>
          ))}
        </Select>
      </div>
      {count > 0 ? (
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={{ pathname: '/packages', query }} aria-live="polite">
            {t('showCount', { count })}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      ) : (
        <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
          <Link href="/request-quote" aria-live="polite">
            {t('noneMatch')}
          </Link>
        </Button>
      )}
    </div>
  );
}
