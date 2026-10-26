'use client';

import * as React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/utils';

/**
 * MonthPicker — design.md §6.3.
 *
 * "12-month grid of toggle buttons (4×3, each ≥ 44 px) plus a year switch;
 * 'I know my exact dates' link switches to a native type=date range."
 *
 * A month, not a date, is the right unit here and that is the whole argument
 * for the control. Someone asking six operators for safari quotes nine months
 * out does not have dates — they have "July, maybe August" — and a date picker
 * forces them to invent two days they will change later. The operators quote on
 * the season anyway.
 *
 * The exact-dates escape hatch uses native `type=date` inputs rather than a
 * second custom calendar: a native date field gets the platform picker, works
 * with a keyboard without any code here, and is the one control where the OS
 * version is better than anything this file could draw.
 */

export type MonthValue = { month: number; year: number } | null;
export type DateRange = { start: string; end: string } | null;

export function MonthPicker({
  label,
  monthNames,
  value,
  onChange,
  exactDates,
  onExactDatesChange,
  exactLabel,
  monthLabel,
  flexibleLabel,
  flexible,
  onFlexibleChange,
  className,
}: {
  label: string;
  /** 12 names in the page's locale, from Intl rather than a message table. */
  monthNames: string[];
  value: MonthValue;
  onChange: (next: MonthValue) => void;
  exactDates?: DateRange;
  onExactDatesChange?: (next: DateRange) => void;
  /** "I know my exact dates" */
  exactLabel?: string;
  /** "Pick a month instead" */
  monthLabel?: string;
  /** "My dates are flexible" */
  flexibleLabel?: string;
  flexible?: boolean;
  onFlexibleChange?: (next: boolean) => void;
  className?: string;
}) {
  const id = React.useId();
  const thisYear = new Date().getFullYear();
  const thisMonth = new Date().getMonth() + 1;
  const [year, setYear] = React.useState(value?.year ?? thisYear);
  const [exact, setExact] = React.useState(Boolean(exactDates));

  // Today's date, for the `min` §6.3 asks for on the exact-date inputs.
  const today = new Date().toISOString().slice(0, 10);

  if (exact && onExactDatesChange) {
    return (
      <fieldset className={cn('min-w-0', className)}>
        <legend className="mb-2 text-label font-semibold text-foreground">{label}</legend>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            min={today}
            value={exactDates?.start ?? ''}
            onChange={(e) =>
              onExactDatesChange({ start: e.target.value, end: exactDates?.end ?? '' })
            }
            className="h-12 flex-1 rounded-sm border-control bg-surface px-3 text-base outline-none focus-visible:border-primary"
          />
          <input
            type="date"
            min={exactDates?.start || today}
            value={exactDates?.end ?? ''}
            onChange={(e) =>
              onExactDatesChange({ start: exactDates?.start ?? '', end: e.target.value })
            }
            className="h-12 flex-1 rounded-sm border-control bg-surface px-3 text-base outline-none focus-visible:border-primary"
          />
        </div>
        {monthLabel && (
          <button
            type="button"
            onClick={() => {
              setExact(false);
              onExactDatesChange(null);
            }}
            className="mt-2 text-body-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {monthLabel}
          </button>
        )}
      </fieldset>
    );
  }

  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="mb-2 text-label font-semibold text-foreground">{label}</legend>

      <div className="mb-2 flex items-center justify-between gap-2">
        <IconButton
          type="button"
          variant="ghost"
          size="sm"
          label={`${year - 1}`}
          disabled={year <= thisYear}
          onClick={() => setYear((y) => y - 1)}
        >
          <ChevronLeft aria-hidden />
        </IconButton>
        <span className="text-body font-semibold tabular-nums">{year}</span>
        <IconButton
          type="button"
          variant="ghost"
          size="sm"
          label={`${year + 1}`}
          disabled={year >= thisYear + 2}
          onClick={() => setYear((y) => y + 1)}
        >
          <ChevronRight aria-hidden />
        </IconButton>
      </div>

      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label={label}>
        {monthNames.map((nameOfMonth, i) => {
          const month = i + 1;
          // A trip cannot start in a month that has already gone.
          const past = year === thisYear && month < thisMonth;
          const selected = value?.month === month && value?.year === year;
          return (
            <button
              key={month}
              type="button"
              disabled={past}
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : { month, year })}
              className={cn(
                'h-11 rounded-sm px-1 text-body-sm font-semibold capitalize',
                'transition-[background-color,border-color,color] duration-[var(--dur-base)]',
                selected
                  ? 'border-control border-primary bg-primary text-primary-foreground'
                  : 'border-control bg-surface text-foreground hover:bg-secondary',
                past && 'cursor-not-allowed opacity-35',
              )}
            >
              {nameOfMonth.slice(0, 3)}
            </button>
          );
        })}
      </div>

      {flexibleLabel && onFlexibleChange && (
        <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-body">
          <input
            id={`${id}-flex`}
            type="checkbox"
            checked={Boolean(flexible)}
            onChange={(e) => onFlexibleChange(e.target.checked)}
            className="size-5 shrink-0 appearance-none rounded-xs border-control bg-surface checked:border-primary checked:bg-primary"
          />
          {flexibleLabel}
        </label>
      )}

      {exactLabel && onExactDatesChange && (
        <button
          type="button"
          onClick={() => {
            setExact(true);
            onChange(null);
            onExactDatesChange({ start: '', end: '' });
          }}
          className="mt-2 text-body-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {exactLabel}
        </button>
      )}

      {value && (
        <>
          <input type="hidden" name="month" value={value.month} />
          <input type="hidden" name="year" value={value.year} />
        </>
      )}
    </fieldset>
  );
}

/** The 12 month names in a locale, for the grid above. */
export function monthNamesFor(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'long' });
  return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(Date.UTC(2026, i, 1))));
}

export { CalendarDays };
