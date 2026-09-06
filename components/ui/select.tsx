import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * A native select, styled once.
 *
 * Fourteen files were hand-writing this, in four variants that had drifted
 * apart: some `text-sm` and some `text-base`, one without the shadow, one
 * without the focus ring. Every dashboard and admin form had a slightly
 * different dropdown, and nobody chose that — it is what happens when a
 * primitive does not exist and the only way to make a select is to copy the
 * last one.
 *
 * Native rather than a Radix listbox, deliberately. A native select gets the
 * platform's own picker on a phone — a wheel on iOS, a bottom sheet on Android
 * — which is better than anything a custom component reproduces, and it costs
 * no JavaScript. The directory's filters are a plain GET form precisely so they
 * work before hydration; a scripted dropdown would undo that.
 *
 * The chevron is drawn here rather than left to the browser because the native
 * arrow is a different shape, size and colour in every browser, and that is
 * visible on a page showing four of them in a row.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  // The native `size` attribute on a <select> is a number — how many rows to
  // show unrolled — and nothing here uses it. Omitting it lets `size` mean the
  // same thing on Select as it does on Button, which is worth more than an
  // attribute the codebase never sets. Without the Omit the two types intersect
  // to `never` and every call site fails to compile.
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
    /**
     * 'bare' drops the border, fill and shadow, for a select that sits inside
     * an already-bounded control — the homepage search pill holds three fields
     * in one white box, and three bordered boxes inside a bordered box is a
     * box too many.
     *
     * This exists so that case is a named variant rather than a caller
     * overriding the primitive's own classes. Overrides work, because cn uses
     * twMerge and the caller wins, but they are invisible to everyone else and
     * they are how a primitive quietly stops being the single source of truth.
     */
    variant?: 'default' | 'bare';
    /** 'lg' matches the search band, where the control is the page's main act. */
    size?: 'default' | 'lg';
  }
>(function Select({ className, children, variant = 'default', size = 'default', ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          // h-11 keeps it on the same rhythm as Input and matches the 44px
          // touch target a phone wants.
          'w-full appearance-none pl-3.5 pr-10 text-sm outline-none transition-colors',
          size === 'lg' ? 'h-12' : 'h-11',
          variant === 'default' && 'rounded-lg border bg-background shadow-xs',
          variant === 'bare' && 'rounded-xl border-0 bg-transparent',
          'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/30',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
});
