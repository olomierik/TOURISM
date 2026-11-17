'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { countryName } from '@/lib/country-names';
import { TRIP_ACTIVITIES, TRIP_INTENTS } from '@/lib/taxonomy/trip';
import type { TourFacet } from '@/lib/queries/packages';
import { TOUR_COUNTRIES } from '@/components/home/tour-finder-options';

/**
 * Country, trip type, activity, where and how long, with a button that says
 * how many tours match before it is pressed — SafariBookings' "Show 5,912
 * Tours".
 *
 * The count is the point. It tells a visitor the search will not come back
 * empty, and it is computed here from the facts the server passed in, so it
 * changes as the selects change with no request in between.
 *
 * Country, trip type and activity were added at the owner's request (17 Nov
 * 2026). Trip type and activity are the operator's (business_intents and
 * business_activities), the same lists the directory filters by, so a tour
 * matches when the company running it offers them.
 *
 * When no tour matches, the button does not offer an empty page: it sends the
 * same choices to the directory, where far more operators are listed than have
 * written up tours, and any of them can answer a quote request.
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
  tours: TourFacet[];
  /** Every destination; one with no tours sends the search to its operators. */
  destinations: Array<{ id: string; slug: string; name: string; countryCode: string | null }>;
}) {
  const t = useTranslations('tours');
  const tIntent = useTranslations('business.intents');
  const tActivity = useTranslations('business.activities');
  const locale = useLocale() as Locale;

  const [country, setCountry] = useState('');
  const [intent, setIntent] = useState('');
  const [activity, setActivity] = useState('');
  const [where, setWhere] = useState('');
  const [length, setLength] = useState<Band | ''>('');

  // A destination in another country than the one chosen is not on offer.
  const places = useMemo(
    () => destinations.filter((d) => !country || (d.countryCode ?? '').toUpperCase() === country),
    [destinations, country],
  );

  const count = useMemo(() => {
    const dest = places.find((d) => d.slug === where);
    const band = length ? BANDS[length] : null;
    return tours.filter(
      (tour) =>
        (!country || tour.countries.includes(country)) &&
        (!intent || tour.intents.includes(intent)) &&
        (!activity || tour.activities.includes(activity)) &&
        (!dest || tour.destinationIds.includes(dest.id)) &&
        (!band || (tour.days !== null && tour.days >= band[0] && tour.days <= band[1])),
    ).length;
  }, [tours, places, country, intent, activity, where, length]);

  const dest = places.find((d) => d.slug === where);
  const tourQuery: Record<string, string> = {};
  const operatorQuery: Record<string, string> = {};
  if (country) tourQuery.country = operatorQuery.country = country;
  if (intent) tourQuery.intent = operatorQuery.intent = intent;
  if (activity) tourQuery.activity = operatorQuery.activity = activity;
  if (dest) {
    tourQuery.where = dest.slug;
    operatorQuery.destination = dest.slug;
  }
  if (length) tourQuery.length = length;

  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-surface p-4 shadow-[var(--elev-xs)] sm:grid-cols-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="finder-country">{t('countryLabel')}</Label>
        <Select
          id="finder-country"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setWhere('');
          }}
        >
          <option value="">{t('anyCountry')}</option>
          {TOUR_COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {countryName(c, locale)}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="finder-intent">{t('tripTypeLabel')}</Label>
        <Select id="finder-intent" value={intent} onChange={(e) => setIntent(e.target.value)}>
          <option value="">{t('anyTripType')}</option>
          {TRIP_INTENTS.map((i) => (
            <option key={i} value={i}>
              {tIntent(i)}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="finder-activity">{t('activityLabel')}</Label>
        <Select id="finder-activity" value={activity} onChange={(e) => setActivity(e.target.value)}>
          <option value="">{t('anyActivity')}</option>
          {TRIP_ACTIVITIES.map((a) => (
            <option key={a} value={a}>
              {tActivity(a)}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="finder-where">{t('whereLabel')}</Label>
        <Select id="finder-where" value={where} onChange={(e) => setWhere(e.target.value)}>
          <option value="">{t('anywhere')}</option>
          {places.map((d) => (
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
      <div className="col-span-2 sm:col-span-1 lg:col-span-1">
        {count > 0 ? (
          <Button asChild size="lg" className="w-full lg:w-auto">
            <Link href={{ pathname: '/packages', query: tourQuery }} aria-live="polite">
              {t('showCount', { count })}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg" variant="outline" className="w-full lg:w-auto">
            <Link href={{ pathname: '/directory', query: operatorQuery }} aria-live="polite">
              {t('seeOperators')}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
