import { cn } from '@/lib/utils';

/**
 * ConditionRating and MonthStrip — design.md §6.13.
 *
 * **"5 segments in a single-hue sequential scale (acacia-100 → acacia-600),
 * plus the text value '4/5' and the label. Never red/green alone."**
 *
 * The red/green rule is the whole point of this component. Wildlife, weather
 * and crowd ratings were drawn on a hue scale — red for bad, green for good —
 * which is invisible to the ~8% of men with red-green colour blindness, and
 * which carries a judgement the data does not support: a month is not *bad*
 * for wildlife, it is different. A single hue getting darker says "more of this
 * thing" without saying whether more is good, and the number beside it means
 * the colour never has to be read at all.
 *
 * **Crowds is inverted and labelled in words.** "Crowds 4/5" is ambiguous — is
 * four a lot of crowds or a good score? — so it reads "Busy 4/5", with Quiet,
 * Moderate and Busy carrying the meaning that the bar alone cannot.
 */

/** Five steps on one hue, light to dark. §3.1's acacia ramp. */
const FILL = [
  'bg-[var(--acacia-100)]',
  'bg-[color-mix(in_oklab,var(--acacia-100),var(--acacia-600)_25%)]',
  'bg-[color-mix(in_oklab,var(--acacia-100),var(--acacia-600)_50%)]',
  'bg-[color-mix(in_oklab,var(--acacia-100),var(--acacia-600)_75%)]',
  'bg-[var(--acacia-600)]',
];

export function ConditionRating({
  label,
  value,
  max = 5,
  /** The word that makes the number mean something — "Busy", "Quiet". */
  valueLabel,
  className,
}: {
  label: string;
  value: number;
  max?: number;
  valueLabel?: string;
  className?: string;
}) {
  const filled = Math.max(0, Math.min(max, Math.round(value)));

  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-body-sm text-muted-foreground">{label}</span>
        <span className="shrink-0 text-body-sm font-semibold tabular-nums">
          {valueLabel ? `${valueLabel} ` : ''}
          {filled}/{max}
        </span>
      </div>
      <div
        className="mt-1.5 flex gap-1"
        role="img"
        aria-label={`${label}: ${valueLabel ? `${valueLabel}, ` : ''}${filled} ${'⁄'} ${max}`}
      >
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-2 flex-1 rounded-pill',
              i < filled ? FILL[Math.min(FILL.length - 1, i)] : 'bg-surface-sunken',
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Quiet / Moderate / Busy, for the inverted crowd scale. */
export function crowdWord(level: number, words: [string, string, string]): string {
  if (level <= 2) return words[0];
  if (level <= 3) return words[1];
  return words[2];
}

export type MonthLevel = 'best' | 'good' | 'low';

/**
 * MonthStrip — §6.13.
 *
 * "12 small cells with a 3-level fill (best/good/low) and text labels on
 * hover/focus and in a visually hidden list."
 *
 * The visually hidden list is not an afterthought: twelve coloured cells are
 * nothing at all to a screen reader, and "best time to visit" is the single
 * most useful fact on a destination page. The list says it in words; the strip
 * says it at a glance.
 */
export function MonthStrip({
  months,
  monthNames,
  legend,
  levelLabels,
  className,
}: {
  /** Twelve entries, January first. */
  months: MonthLevel[];
  monthNames: string[];
  legend: string;
  /** Translations for best / good / low, for the title and the hidden list. */
  levelLabels: Record<MonthLevel, string>;
  className?: string;
}) {
  const tone: Record<MonthLevel, string> = {
    best: 'bg-[var(--acacia-600)] text-white',
    good: 'bg-[var(--acacia-100)] text-[var(--acacia-800)]',
    low: 'bg-surface-sunken text-muted-foreground',
  };

  return (
    <div className={cn('min-w-0', className)}>
      <p className="mb-2 text-label font-semibold">{legend}</p>
      <ul aria-hidden className="grid grid-cols-6 gap-1 sm:grid-cols-12">
        {months.map((level, i) => (
          <li
            key={i}
            title={`${monthNames[i]}: ${levelLabels[level]}`}
            className={cn(
              'flex h-9 items-center justify-center rounded-xs text-caption font-semibold',
              tone[level],
            )}
          >
            {monthNames[i].slice(0, 1)}
          </li>
        ))}
      </ul>
      {/* The same information, in words, for anyone the strip cannot reach. */}
      <ul className="sr-only">
        {months.map((level, i) => (
          <li key={i}>{`${monthNames[i]}: ${levelLabels[level]}`}</li>
        ))}
      </ul>
    </div>
  );
}
