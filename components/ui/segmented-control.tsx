'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * SegmentedControl — design.md §6.3.
 *
 * "2–4 options, 44 px, track --surface-sunken, selected --surface + --elev-xs
 * (light). **Not filled blue.** Implement as a radio group."
 *
 * The "not filled blue" is the correction. A segmented control with a solid
 * primary segment looks like a row of buttons, one of which is pressed — and a
 * pressed button suggests something happened, where a selected segment means
 * "this is the mode you are in". Raising the selected segment on the page's own
 * surface, with the sunken track behind it, says mode rather than action, and
 * leaves the one action colour for the actual action (§3.1).
 *
 * Native radios again, for the reasons in `chip.tsx`: one Tab stop for the
 * group, arrow keys between options, and a working value in a form that has
 * not hydrated.
 */
export function SegmentedControl<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  className,
  hideLegend = false,
}: {
  name: string;
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange?: (next: T) => void;
  className?: string;
  /** The control's own labels sometimes make the legend redundant on screen. */
  hideLegend?: boolean;
}) {
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend
        className={cn(
          'text-label font-semibold text-foreground',
          hideLegend ? 'sr-only' : 'mb-2',
        )}
      >
        {legend}
      </legend>
      <div
        className={cn(
          'grid gap-1 rounded-sm bg-surface-sunken p-1',
          // The track is a grid rather than a flex row so every segment is the
          // same width whatever its label says — otherwise "Budget" and
          // "Mid-range" make two different-sized targets out of one control.
          options.length === 2 && 'grid-cols-2',
          options.length === 3 && 'grid-cols-3',
          options.length >= 4 && 'grid-cols-4',
        )}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'relative flex h-11 cursor-pointer items-center justify-center rounded-[calc(var(--radius-sm)-2px)]',
              'px-2 text-center text-body-sm font-semibold text-muted-foreground',
              'transition-[background-color,color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)]',
              'has-[:checked]:bg-surface has-[:checked]:text-foreground has-[:checked]:shadow-[var(--elev-xs)]',
              'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ring)]',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange?.(option.value)}
              className="absolute size-px opacity-0"
            />
            <span className="truncate">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
