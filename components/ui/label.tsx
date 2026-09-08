import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * `size="sm"` is small tracked capitals, for a dense stack of fields.
 *
 * The directory sidebar carries seven of them and stood 770px tall, so its
 * "Show results" button sat below the fold on a laptop — on a filter panel,
 * where the button is the point. A label at 14.5px on its own line costs 21px
 * before the control it names; at 13px capitals it costs 16px and reads more
 * clearly as a label rather than as text, because capitals at that size are
 * unmistakably a heading for something.
 *
 * A variant rather than seven call-site overrides, for the same reason Select
 * has one: an override works, because cn uses twMerge and the caller wins, but
 * it is invisible to everyone else and it is how a primitive quietly stops
 * being the single source of truth.
 */
function Label({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'label'> & { size?: 'default' | 'sm' }) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 font-medium leading-none select-none',
        // `text-xs/tight`, not `text-xs`. In Tailwind v4 a `text-*` utility
        // emits its own line-height from the paired token, and it wins the
        // cascade over the `leading-none` above — so that class has never
        // actually applied to a Label, and a 13px label was still boxed at
        // 19px. The slash form sets both in one utility, which is the only way
        // to state the intent and have it hold.
        //
        // Left alone for `default` deliberately: the same fix there would
        // change the height of every field in all 25 form files, which is a
        // bigger change than this one is allowed to be.
        size === 'sm'
          ? 'text-xs/tight uppercase tracking-wide text-muted-foreground'
          : 'text-sm',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
