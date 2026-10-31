'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { DateRange, MonthValue } from '@/components/ui/month-picker';
import { cn } from '@/lib/utils';

/**
 * WhenPicker — the homepage search bar's When panel.
 *
 * Two views in one small panel. First a 4×3 grid of months with a year
 * switch; tapping a month opens that month's days. From there a traveller can
 * either keep the whole month ("Any day in July", the month value the form
 * always sent) or tap an arrival and a departure day (the exact start/end the
 * form also already sent). Nothing new reaches /request-quote: the same
 * `month`/`year` or `start`/`end` values as before.
 */
export function WhenPicker({
  locale,
  monthNames,
  value,
  exactDates,
  onMonth,
  onDates,
  onDone,
  labels,
}: {
  locale: string;
  monthNames: string[];
  value: MonthValue;
  exactDates: DateRange;
  onMonth: (next: MonthValue) => void;
  onDates: (next: DateRange) => void;
  onDone: () => void;
  labels: {
    anyDayIn: (month: string) => string;
    datesHint: string;
    done: string;
    clear: string;
    allMonths: string;
    prev: string;
    next: string;
  };
}) {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const today = iso(thisYear, thisMonth, now.getDate());
  const maxYear = thisYear + 2;

  // Open on whatever is already chosen, so reopening the panel shows it.
  const startFromDates = exactDates?.start ? parseIso(exactDates.start) : null;
  const [year, setYear] = React.useState(startFromDates?.year ?? value?.year ?? thisYear);
  const [dayView, setDayView] = React.useState<{ month: number; year: number } | null>(
    startFromDates ? { month: startFromDates.month, year: startFromDates.year } : value ?? null,
  );

  const weekdayNames = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    // 2026-01-05 is a Monday; the grid starts weeks on Monday.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2026, 0, 5 + i))));
  }, [locale]);

  const navBtn =
    'grid size-8 place-items-center rounded-full text-foreground hover:bg-secondary disabled:pointer-events-none disabled:opacity-30';

  if (dayView) {
    const { month, year: y } = dayView;
    const daysInMonth = new Date(y, month, 0).getDate();
    // Monday-first offset of the 1st.
    const lead = (new Date(y, month - 1, 1).getDay() + 6) % 7;
    const start = exactDates?.start || '';
    const end = exactDates?.end || '';
    const atFirst = y === thisYear && month === thisMonth;
    const atLast = y === maxYear && month === 12;

    const step = (delta: number) => {
      const d = new Date(y, month - 1 + delta, 1);
      setDayView({ month: d.getMonth() + 1, year: d.getFullYear() });
      setYear(d.getFullYear());
    };

    const pickDay = (day: string) => {
      // First tap (or a tap before the current start) sets arrival; the next
      // tap sets departure.
      if (!start || end || day < start) onDates({ start: day, end: '' });
      else onDates({ start, end: day });
    };

    return (
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button type="button" className={navBtn} onClick={() => step(-1)} disabled={atFirst} aria-label={labels.prev}>
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setDayView(null)}
            className="rounded-full px-3 py-1 text-body-sm font-semibold capitalize hover:bg-secondary"
            aria-label={`${labels.allMonths}: ${monthNames[month - 1]} ${y}`}
          >
            {monthNames[month - 1]} {y}
          </button>
          <button type="button" className={navBtn} onClick={() => step(1)} disabled={atLast} aria-label={labels.next}>
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-[0.6875rem] font-semibold uppercase text-muted-foreground">
          {weekdayNames.map((w, i) => (
            <span key={i} className="py-1">
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5" role="group" aria-label={`${monthNames[month - 1]} ${y}`}>
          {Array.from({ length: lead }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = iso(y, month, i + 1);
            const past = day < today;
            const isStart = day === start;
            const isEnd = day === end;
            const inRange = Boolean(start && end && day > start && day < end);
            return (
              <button
                key={day}
                type="button"
                disabled={past}
                aria-pressed={isStart || isEnd}
                onClick={() => pickDay(day)}
                className={cn(
                  'h-9 text-body-sm tabular-nums transition-colors',
                  inRange && 'bg-secondary',
                  isStart || isEnd
                    ? 'rounded-full bg-primary font-semibold text-primary-foreground'
                    : 'rounded-full hover:bg-secondary',
                  inRange && 'rounded-none',
                  day === today && !isStart && !isEnd && 'font-bold text-primary',
                  past && 'cursor-not-allowed opacity-30',
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <p className="mt-2 text-[0.75rem] text-muted-foreground">{labels.datesHint}</p>

        <button
          type="button"
          onClick={() => {
            onDates(null);
            onMonth({ month, year: y });
            onDone();
          }}
          className="mt-2 w-full rounded-full border px-3 py-2 text-body-sm font-semibold hover:bg-secondary"
        >
          {labels.anyDayIn(monthNames[month - 1])}
        </button>
        <div className="mt-2 flex items-center justify-end gap-2">
          {start ? (
            <button
              type="button"
              onClick={() => onDates(null)}
              className="shrink-0 rounded-full px-2 py-2 text-body-sm font-semibold text-muted-foreground hover:bg-secondary"
            >
              {labels.clear}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDone}
            disabled={!start}
            className="shrink-0 rounded-full bg-primary px-4 py-2 text-body-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {labels.done}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className={navBtn}
          onClick={() => setYear((v) => v - 1)}
          disabled={year <= thisYear}
          aria-label={`${year - 1}`}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span className="text-body-sm font-semibold tabular-nums">{year}</span>
        <button
          type="button"
          className={navBtn}
          onClick={() => setYear((v) => v + 1)}
          disabled={year >= maxYear}
          aria-label={`${year + 1}`}
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label={String(year)}>
        {monthNames.map((name, i) => {
          const month = i + 1;
          const past = year === thisYear && month < thisMonth;
          const selected =
            (value?.month === month && value?.year === year) ||
            (startFromDates?.month === month && startFromDates?.year === year);
          return (
            <button
              key={month}
              type="button"
              disabled={past}
              aria-pressed={selected}
              onClick={() => setDayView({ month, year })}
              className={cn(
                'h-10 rounded-lg border text-body-sm font-semibold capitalize transition-colors',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-surface text-foreground hover:bg-secondary',
                past && 'cursor-not-allowed opacity-35',
              )}
            >
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseIso(v: string) {
  const [y, m] = v.split('-').map(Number);
  return y && m ? { year: y, month: m } : null;
}
