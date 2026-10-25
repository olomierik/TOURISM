import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * design.md §6.3.
 *
 * The border is the change that matters. It was `border`, which resolves to
 * --border at 1.58:1 against white — fine for a divider, and below the 3:1 that
 * WCAG 1.4.11 requires for the boundary of a control. --border-strong is
 * 3.14:1 and exists for exactly this. 1.5px rather than 1px, per §3.4.
 *
 * Radius drops from rounded-xl to --radius-sm (10px): §3.4 gives inputs their
 * own radius so a field is distinguishable from a card at 16px and a button at
 * 12px.
 *
 * The focus treatment moves out. It used to paint its own ring here, which is
 * why the site had several; §3.7 now owns one :focus-visible style globally, so
 * this only darkens its border to --primary and lets the global outline do the
 * rest.
 *
 * 16px text is not a style choice: below it, iOS zooms the page on focus.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-12 w-full min-w-0 rounded-sm border-control bg-surface px-3.5 py-2 text-base outline-none',
        'transition-[border-color] duration-[var(--dur-fast)]',
        'placeholder:text-muted-foreground',
        // §3.7 draws the ring; this only strengthens the border under it.
        'focus-visible:border-primary',
        'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60',
        // aria-invalid rather than a prop, so native validation and server-side
        // errors style identically.
        'aria-invalid:border-danger',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
