'use client';

import { useId, useRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * A tab strip with real keyboard behaviour.
 *
 * Two places hand-rolled this — the seasonality timeline's twelve months and
 * the trip planner — and both got the same thing wrong in the same way: they
 * set `role="tablist"` and `aria-selected`, which tells a screen-reader user
 * this is a tab strip, and then left the arrow keys unhandled. Announcing tabs
 * and then not behaving like tabs is worse than plain buttons, because the
 * promise is made and broken.
 *
 * The APG pattern this implements: Left/Right move between tabs, Home and End
 * jump to the ends, and only the selected tab is in the tab order, so Tab
 * moves past the strip rather than through twelve months of it.
 *
 * Deliberately not Radix. This is roughly forty lines against a dependency, the
 * markup stays legible, and the seasonality strip needs to scroll horizontally
 * on a phone — which is easier to keep working when the DOM is ours.
 */
export function Tabs({
  value,
  onValueChange,
  items,
  label,
  className,
  itemClassName,
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: Array<{ value: string; label: React.ReactNode }>;
  /** Names the strip for a screen reader. */
  label: string;
  className?: string;
  itemClassName?: string;
}) {
  const id = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(e: React.KeyboardEvent) {
    const i = items.findIndex((t) => t.value === value);
    if (i < 0) return;
    const last = items.length - 1;
    let next: number | null = null;

    if (e.key === 'ArrowRight') next = i === last ? 0 : i + 1;
    else if (e.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;

    e.preventDefault();
    const target = items[next];
    onValueChange(target.value);
    // Move focus with the selection, which is what makes arrow-key navigation
    // feel like a tab strip rather than like changing a value from a distance.
    refs.current[target.value]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {items.map((t) => {
        const selected = t.value === value;
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[t.value] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-${t.value}`}
            aria-selected={selected}
            // Only the selected tab is reachable by Tab. The rest are reached
            // with the arrow keys, per the APG pattern.
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(t.value)}
            className={cn(
              'relative shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              selected ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/70',
              itemClassName,
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
