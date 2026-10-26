'use client';

import * as React from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * ToggleChip and ChipGroup — design.md §6.3.
 *
 * A chip is a pill; a button is not (§3.4). That is the one piece of geometry
 * that tells a filter apart from an action, and it was absent — the audit found
 * about ten button styles all at pill radius, so a chip that narrows a list and
 * a button that sends a request were the same shape.
 *
 * The native input is kept and visually hidden rather than replaced by
 * `role=radio` on a div, because the browser already gives us the whole
 * keyboard contract §6.3 asks for: arrow keys moving through a radio group and
 * skipping to it with one Tab stop, space toggling a checkbox, and — through a
 * shared `name` — the group behaving as one value in a plain form submit. The
 * directory's filters are a GET form precisely so they work before hydration,
 * and that only holds if the chips are real inputs.
 *
 * §6.3 attaches one condition to hiding the input: "the current visually-hidden
 * 1 px inputs are fine **only if** the chip shows a focus ring when its hidden
 * input is focused." `peer-focus-visible` is that ring, drawn on the label.
 */

export function ToggleChip({
  name,
  value,
  label,
  type = 'radio',
  defaultChecked,
  checked,
  onChange,
  icon,
  className,
  disabled,
}: {
  name: string;
  value: string;
  label: React.ReactNode;
  /** `radio` for single-select (the usual case), `checkbox` for multi. */
  type?: 'radio' | 'checkbox';
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'group relative inline-flex cursor-pointer select-none items-center gap-2',
        // 40px tall with a 44px hit area from the vertical padding (§6.3).
        'h-10 whitespace-nowrap rounded-pill px-4 text-body-sm font-semibold',
        'border-control bg-surface text-foreground',
        'transition-[background-color,border-color,color] duration-[var(--dur-base)] ease-[var(--ease-out)]',
        'hover:bg-secondary',
        // Selected: primary fill. The check icon carries the state as well as
        // the colour, because §3.1 forbids colour as the only signal.
        'has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground',
        'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40',
        // The ring the hidden input would otherwise swallow.
        'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ring)]',
        className,
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="absolute size-px opacity-0"
      />
      <Check className="hidden size-4 group-has-[:checked]:block" aria-hidden />
      {icon}
      {label}
    </label>
  );
}

/**
 * The fieldset §6.3 requires. A group of chips without a legend is a row of
 * controls with no stated question, which is exactly how it reads to a screen
 * reader: five unexplained options.
 */
export function ChipGroup({
  legend,
  hint,
  children,
  className,
  scroll = false,
}: {
  legend: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * Horizontal scroll instead of wrapping. The homepage hero puts trip-type
   * chips above the Where field on a phone, where four of them wrap to two
   * rows and push the CTA off the first screen (§7.1).
   */
  scroll?: boolean;
}) {
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="mb-2 text-label font-semibold text-foreground">{legend}</legend>
      {hint && <p className="-mt-1 mb-2 text-body-sm text-muted-foreground">{hint}</p>}
      <div
        className={cn(
          'flex gap-2',
          scroll
            ? // -mx/px pair so a selected chip's ring is not clipped by the
              // scroll container at either end.
              'scrollbar-none -mx-1 overflow-x-auto px-1 pb-1'
            : 'flex-wrap',
        )}
      >
        {children}
      </div>
    </fieldset>
  );
}
