import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * IconButton — design.md §6.2.
 *
 * "44×44 hit area, 20 px icon, radius-md". The hit area is the whole point:
 * the audit found icon-only controls at 32 and 36 px, which are below the 24 px
 * minimum WCAG 2.2 sets for a target and well below what a thumb hits on a
 * moving vehicle, which is where half this site is read.
 *
 * `aria-label` is required by the type, not by convention — an icon-only button
 * with no label is a button that announces itself as "button". When the control
 * is a toggle it also takes `pressed`, which §6.2 asks for on Save.
 *
 * `on-photo` is the third variant because cards put Save over the cover image:
 * white at 90% with an ink glyph, and the `.on-photo` class switches the global
 * focus ring to Sun (§3.7) so the ring is visible against a photograph.
 */
const iconButtonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center rounded-md',
    'transition-[background-color,border-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)]',
    'outline-none disabled:pointer-events-none disabled:opacity-40',
    "[&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        secondary: 'border-control bg-surface text-foreground hover:bg-secondary',
        ghost: 'text-foreground hover:bg-secondary',
        /** Over a photograph. Pairs with the Sun focus ring. */
        'on-photo':
          'on-photo bg-white/90 text-[oklch(0.219_0.032_264)] shadow-[var(--elev-sm)] backdrop-blur-sm hover:bg-white',
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        whatsapp: 'bg-whatsapp text-whatsapp-foreground hover:brightness-110',
      },
      size: {
        /** 44×44 — the §6.2 default, and the only size for touch. */
        md: 'size-11',
        /** 36×36. Dense desktop toolbars only, same restriction as Button sm. */
        sm: 'size-9',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
);

export function IconButton({
  className,
  variant,
  size,
  asChild = false,
  label,
  pressed,
  children,
  ...props
}: Omit<React.ComponentProps<'button'>, 'aria-label' | 'aria-pressed'> &
  VariantProps<typeof iconButtonVariants> & {
    asChild?: boolean;
    /**
     * Required. §6.2: "It needs an aria-label." Typed rather than documented so
     * a missing label is a compile error instead of an audit finding.
     */
    label: string;
    /** Set this when the button is a toggle, e.g. Save. */
    pressed?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="icon-button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cn(iconButtonVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </Comp>
  );
}

export { iconButtonVariants };
