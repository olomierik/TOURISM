'use client';

import { Minus, Plus } from 'lucide-react';

import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/utils';

/**
 * Stepper — design.md §6.3.
 *
 * "label, − / value / + (44 px buttons with aria-label 'Fewer adults'/'More
 * adults'), the value in an `<output aria-live="polite">`, min/max enforced."
 *
 * The `<output>` is the part worth keeping. A number that changes silently is
 * invisible to a screen reader: the button says "More adults", the reader
 * presses it, and nothing is announced, so the only way to learn the new value
 * is to navigate away and back. `aria-live="polite"` on the value means each
 * press reads "3".
 *
 * The buttons carry their own labels — "Fewer adults", not "minus" — because
 * a quote form has three steppers and "minus button, minus button, minus
 * button" tells the reader nothing about which number moves.
 */
export function Stepper({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max = 20,
  decrementLabel,
  incrementLabel,
  className,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** e.g. "Fewer adults". Falls back to a generic form built from `label`. */
  decrementLabel?: string;
  incrementLabel?: string;
  className?: string;
}) {
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <span className="block text-label font-semibold text-foreground">{label}</span>
        {hint && <span className="block text-body-sm text-muted-foreground">{hint}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          type="button"
          variant="secondary"
          label={decrementLabel ?? `Fewer ${label.toLowerCase()}`}
          disabled={atMin}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus aria-hidden />
        </IconButton>
        <output
          aria-live="polite"
          className="w-10 text-center text-body font-semibold tabular-nums text-foreground"
        >
          {value}
        </output>
        <IconButton
          type="button"
          variant="secondary"
          label={incrementLabel ?? `More ${label.toLowerCase()}`}
          disabled={atMax}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus aria-hidden />
        </IconButton>
      </div>
    </div>
  );
}
