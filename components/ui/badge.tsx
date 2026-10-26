import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Badge — design.md §6.4.
 *
 * "overline-sized text in a radius-xs pill with a leading icon."
 *
 * Not a pill-radius pill: §3.4 reserves 999px for chips and avatars, so a badge
 * takes radius-xs. A badge and a filter chip were previously the same shape,
 * which made a trust signal look like something you could click to narrow a
 * list.
 *
 * The three verification variants are the §6.4 table, and they replace a
 * sentence. The business page carried "Explore Tanzania has checked that this
 * business is real and run by…" inline; §6.4 says put the badge there and the
 * explanation in a tooltip and on /about#verification. A paragraph asserting
 * trust is weaker than a label that means something specific, because the
 * paragraph is the same on every listing.
 *
 * There is deliberately no `featured` variant. §6.4: "Featured — No badge;
 * placement only." A badge that can be bought is not a trust signal, and §8.2
 * is explicit that "Featured" is never sold. The paid tier still orders
 * listings; it no longer wears a mark that looks like verification.
 */
const badgeVariants = cva(
  [
    'inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap',
    'rounded-xs px-2 py-0.5',
    'text-overline font-semibold uppercase',
    '[&>svg]:size-3 [&>svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        /** §6.4 Listed: built from public sources, unclaimed. */
        listed: 'bg-[var(--ink-100)] text-[var(--ink-700)]',
        /** §6.4 Claimed: owner verified email, phone or website domain. */
        claimed: 'bg-[var(--info-50)] text-[var(--info-700)]',
        /** §6.4 Licence checked: verified against the licensing records. */
        licence: 'bg-[var(--success-50)] text-[var(--success-800)]',

        /** Not a trust tier: a warning that the row is sample data. */
        demo: 'border border-dashed border-muted-foreground/40 bg-muted text-muted-foreground',

        /* ------------------------------------------------- migration aliases
         * The badge is used on about 40 surfaces that Phases 5-8 have not
         * reached yet. These keep them compiling and restyle them to the new
         * geometry; each dies with the file that uses it.
         *
         * `featured` maps to `listed` rather than keeping a green or primary
         * fill, so a paid tier stops reading as a checked one even on the
         * pages not yet rebuilt. */
        /** @deprecated §6.4 gives Featured no badge — use placement */
        featured: 'bg-[var(--ink-100)] text-[var(--ink-700)]',
        /** @deprecated use `licence` */
        verified: 'bg-[var(--success-50)] text-[var(--success-800)]',
        /** @deprecated use `listed` */
        default: 'bg-[var(--ink-100)] text-[var(--ink-700)]',
        /** @deprecated use `listed` */
        secondary: 'bg-secondary text-secondary-foreground',
        /** @deprecated use `listed` */
        outline: 'border bg-surface text-foreground',
      },
    },
    defaultVariants: { variant: 'listed' },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
