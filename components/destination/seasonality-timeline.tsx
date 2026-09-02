'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CloudRain, Droplets, Sun, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type SeasonMonth = {
  month: number;
  wildlife: number | null;
  weather: number | null;
  crowd: number | null;
  rainfallMm: number | null;
  tempMinC: number | null;
  tempMaxC: number | null;
  highlight: string | null;
  isPeak: boolean;
};

/**
 * Month-by-month conditions, one month at a time.
 *
 * The table this sits above is 1,077 pixels — the tallest single thing on a
 * destination page and more than a screenful of numbers presented before
 * anybody has said which month they care about. Almost every reader wants one
 * row of it.
 *
 * So the twelve months become a strip, and choosing one reveals its detail.
 * The table itself is not deleted: it stays underneath in a <details>, which
 * keeps it in the DOM for search engines, available to anyone who genuinely
 * wants all twelve at once, and readable by a screen reader as the table it
 * always was. Progressive disclosure, not removal — the content is the same
 * and only the order it arrives in has changed.
 */
function Meter({
  value,
  max = 5,
  tone,
  label,
}: {
  value: number | null;
  max?: number;
  tone: 'wildlife' | 'weather' | 'crowd';
  label: string;
}) {
  if (value === null) return <span className="text-muted-foreground">—</span>;

  // Crowds invert: a high value is a negative, so it reads warning-coloured
  // rather than the success green used for wildlife and weather.
  const toneClass = { wildlife: 'bg-success', weather: 'bg-accent', crowd: 'bg-warning' }[tone];

  return (
    <span className="flex items-center gap-0.5">
      <span className="sr-only">{`${label}: ${value} / ${max}`}</span>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn('h-4 w-1.5 rounded-full', i < value ? toneClass : 'bg-border')}
        />
      ))}
    </span>
  );
}

export function SeasonalityTimeline({ months }: { months: SeasonMonth[] }) {
  const t = useTranslations('destination');
  const tMonths = useTranslations('months');

  // Opens on the current month, which is the one a reader is most likely to be
  // asking about — somebody planning in March usually starts from March.
  const thisMonth = new Date().getMonth() + 1;
  const [selected, setSelected] = useState(
    months.find((m) => m.month === thisMonth)?.month ?? months[0]?.month ?? 1,
  );

  const month = months.find((m) => m.month === selected) ?? months[0];
  if (!month) return null;

  return (
    <div className="mt-8">
      {/* The strip. Twelve buttons, scrollable on a phone rather than wrapped
          into three ragged rows. */}
      <div
        role="tablist"
        aria-label={t('seasonalitySubtitle')}
        className="flex gap-1.5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {months.map((m) => (
          <button
            key={m.month}
            role="tab"
            aria-selected={m.month === selected}
            onClick={() => setSelected(m.month)}
            className={cn(
              'relative shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              m.month === selected
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/70',
            )}
          >
            {tMonths(String(m.month) as '1').slice(0, 3)}
            {/* Peak months are marked on the strip itself, so the best time to
                come is visible before anything is pressed. */}
            {m.isPeak && (
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-3 bottom-1 h-0.5 rounded-full',
                  m.month === selected ? 'bg-primary-foreground/70' : 'bg-warning',
                )}
              />
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-xl font-semibold">
            {tMonths(String(month.month) as '1')}
          </h3>
          {month.isPeak && <Badge variant="featured">{t('peak')}</Badge>}
        </div>

        {month.highlight && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{month.highlight}</p>
        )}

        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sun className="size-3.5" aria-hidden />
              {t('wildlife')}
            </dt>
            <dd className="mt-1.5">
              <Meter value={month.wildlife} tone="wildlife" label={t('wildlife')} />
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CloudRain className="size-3.5" aria-hidden />
              {t('weather')}
            </dt>
            <dd className="mt-1.5">
              <Meter value={month.weather} tone="weather" label={t('weather')} />
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Users className="size-3.5" aria-hidden />
              {t('crowds')}
            </dt>
            <dd className="mt-1.5">
              <Meter value={month.crowd} tone="crowd" label={t('crowds')} />
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Droplets className="size-3.5" aria-hidden />
              {t('rainfall')}
            </dt>
            <dd className="mt-1.5 text-sm tabular-nums">
              {month.rainfallMm === null ? '—' : `${month.rainfallMm} mm`}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">{t('temp')}</dt>
            <dd className="mt-1.5 text-sm tabular-nums">
              {month.tempMinC === null || month.tempMaxC === null
                ? '—'
                : `${month.tempMinC}–${month.tempMaxC} °C`}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
