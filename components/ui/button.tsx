import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Button — design.md §6.1.
 *
 * Not a pill any more, and that is the point of the change rather than a side
 * effect of it. §3.4: "Buttons are no longer pills; this separates actions from
 * filters." The audit found about ten button styles with pill radius on all of
 * them, so a chip and a submit button were the same shape and nothing in the
 * geometry said which one did something. Buttons take --radius-md (12px); the
 * pill is now reserved for chips and avatars.
 *
 * Sizes are 36 / 44 / 52, down from 36 / 48 / 56 / 64. 44 is the default
 * because that is the touch target, and `sm` carries a warning in its own name:
 * §6.1 restricts it to dense desktop toolbars and says never on mobile.
 *
 * Six variants, mapped from the ten found (Appendix A). Two are new:
 * `highlight` is the Sun fill, which §3.1 allows only inside a Night band and
 * never more than one per screen; `whatsapp` is success-700 rather than the
 * brand #25D366, because white on the brand green is 1.98:1 and fails at any
 * size. `accent` is gone — it was the retired red.
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap',
    'rounded-full font-semibold',
    // §3.5: hover and press are --dur-fast. Only the properties that actually
    // change are transitioned, so a button does not animate its own layout.
    'transition-[background-color,border-color,color,box-shadow,transform]',
    'duration-[var(--dur-fast)] ease-[var(--ease-out)]',
    // §6.1 active state.
    'active:translate-y-px',
    // §3.7 owns the focus ring, globally, on :focus-visible. Nothing here.
    'outline-none',
    'disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed',
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        /** Acacia fill. The one action colour (§3.1). */
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        /** White, 1.5px border-strong, ink text. */
        secondary:
          'border-control bg-surface text-foreground hover:bg-secondary',
        /** No border, primary text. */
        ghost: 'text-primary hover:bg-primary-subtle',
        /**
         * Sun fill, sun-900 text. §3.1: never more than one sun-filled element
         * per screen, and only inside a Night section.
         */
        highlight: 'bg-highlight text-highlight-foreground hover:brightness-95',
        /**
         * success-700, not #25D366. White on the brand green is 1.98:1.
         */
        whatsapp: 'bg-whatsapp text-whatsapp-foreground hover:brightness-110',
        danger: 'bg-danger text-danger-foreground hover:brightness-110',
        /** Over hero photography. Pairs with `.on-photo` for the Sun focus ring. */
        glass:
          'on-photo border border-white/25 bg-white/12 text-white backdrop-blur-md hover:bg-white/20',
        /** Inline text action. Not a button shape at all. */
        link: 'text-primary underline-offset-4 hover:underline',

        /* ----------------------------------------------- migration aliases
         * 197 call sites use the old names — outline 55, destructive 33,
         * accent 3, plus 46 relying on `default`. Appendix A maps each onto a
         * new variant, and these aliases apply that mapping at the component
         * instead of in 91 separate edits bundled into a component rewrite.
         *
         * They render the new styles, so the visual change lands everywhere at
         * once and nothing breaks at compile time. Each dies as Phases 3-8
         * touch the file that uses it. */
        /** @deprecated use `primary` */
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        /** @deprecated use `secondary` — Appendix A maps white/bordered here */
        outline:
          'border-control bg-surface text-foreground hover:bg-secondary',
        /** @deprecated use `danger` */
        destructive: 'bg-danger text-danger-foreground hover:brightness-110',
        /** @deprecated the red accent is retired (§3); this is now primary */
        accent: 'bg-primary text-primary-foreground hover:bg-primary-hover',
      },
      size: {
        /** 36px. §6.1: dense desktop toolbars only, never on mobile. */
        sm: 'h-9 px-4 text-sm',
        /** 44px — the touch target, and the default. */
        md: 'h-11 px-5 text-sm',
        /** 52px — form submits, hero CTA, mobile action bar. */
        lg: 'h-13 px-6 text-base',
        /** 44x44, for an icon alone (§6.2). */
        icon: 'size-11 px-0',

        /** @deprecated use `md` */
        default: 'h-11 px-5 text-sm',
        /** @deprecated use `lg` — the 64px size is gone (§6.1 tops out at 52) */
        xl: 'h-13 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  disabled,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /**
     * §6.1: the spinner replaces the leading icon and the label is kept, so the
     * button neither changes width nor stops saying what it does. `aria-busy`
     * announces the wait; `disabled` stops a second submit.
     */
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  // A Slot forwards to exactly one child, so the spinner cannot be injected
  // alongside it — `asChild` and `loading` are mutually exclusive by
  // construction rather than by convention.
  const content =
    loading && !asChild ? (
      <>
        <Loader2 className="size-5 animate-spin" aria-hidden />
        {children}
      </>
    ) : (
      children
    );

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled ?? (loading && !asChild) ? true : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </Comp>
  );
}

export { Button, buttonVariants };
