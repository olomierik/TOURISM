import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Checkbox and Radio — design.md §6.3.
 *
 * "20 px box, 44 px row hit area, 1.5 px --border-strong, checked --primary.
 * The current 16 px verified-only checkbox becomes this."
 *
 * Two numbers are doing the work. The box is 20 px because the directory's
 * filter checkbox was 16, and a 16 px box on a phone is a target you miss. The
 * *row* is 44 px because the box does not have to grow to 44 for the target to
 * be 44 — the label is part of the control, so padding the row gives a thumb
 * the whole line while the box stays the size it should look.
 *
 * `appearance-none` with a drawn check, rather than the platform control,
 * because the native box cannot take a 1.5 px --border-strong edge or the
 * primary fill in any browser, and the alternative is one control that looks
 * different in each.
 */
export const Checkbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<'input'>, 'type'> & { indeterminate?: boolean }
>(function Checkbox({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'peer size-5 shrink-0 appearance-none rounded-xs bg-surface',
        'border-control',
        'transition-[background-color,border-color] duration-[var(--dur-fast)]',
        'checked:border-primary checked:bg-primary',
        // The tick: a background image rather than a pseudo-element, because
        // an <input> cannot carry one. The image itself is `.checkbox-tick` in
        // globals.css — a data URI does not survive a Tailwind arbitrary
        // value, and the note there records both ways it failed.
        'checkbox-tick',
        'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60',
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    />
  );
});

export const Radio = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<'input'>, 'type'>
>(function Radio({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="radio"
      className={cn(
        'peer size-5 shrink-0 appearance-none rounded-pill bg-surface',
        'border-control',
        'transition-[background-color,border-color,box-shadow] duration-[var(--dur-fast)]',
        // A ring-inset dot, so the fill reads as a filled circle inside the
        // border rather than a solid disc with no edge.
        'checked:border-primary checked:bg-primary checked:shadow-[inset_0_0_0_3px_var(--surface)]',
        'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
});

/**
 * The 44 px row §6.3 asks for: box, label, optional hint, whole line tappable.
 *
 * Takes the box as a child rather than rendering one, so a Checkbox and a Radio
 * share the row and the row does not have to know which it holds.
 */
export function ChoiceRow({
  id,
  label,
  hint,
  children,
  className,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('flex min-h-11 items-start gap-3 py-2.5', className)}>
      <span className="flex h-6 items-center">{children}</span>
      <span className="min-w-0 flex-1">
        <label htmlFor={id} className="block cursor-pointer text-body text-foreground">
          {label}
        </label>
        {hint && (
          <span id={hintId} className="mt-0.5 block text-body-sm text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
    </div>
  );
}
