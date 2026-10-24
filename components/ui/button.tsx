import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Pill-shaped at every size, as on GetYourGuide and Viator: the rounded
// rectangle read as a form control, the pill reads as an action.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        // The money button. Slight lift on hover reads as tactile without being showy.
        default:
          'bg-primary text-primary-foreground shadow-sm hover:brightness-110 hover:shadow-md active:brightness-95',
        accent:
          'bg-accent text-accent-foreground shadow-sm hover:brightness-110 hover:shadow-md active:brightness-95',
        outline:
          'border bg-background shadow-xs hover:bg-secondary hover:text-secondary-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:brightness-95',
        // Reserved for actions that take something away — rejecting a listing,
        // deleting, suspending. Deliberately distinct from `default` so a
        // destructive action never looks like the safe one.
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:brightness-110 active:brightness-95 focus-visible:ring-destructive',
        ghost: 'hover:bg-secondary hover:text-secondary-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // For placing over hero photography
        glass:
          'bg-white/12 text-white backdrop-blur-md border border-white/25 hover:bg-white/20',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        // 44px, the height of Input and Select, so a button beside a field
        // lines up with it (the directory's filter bar, every inline form).
        default: 'h-11 px-5 py-2',
        lg: 'h-12 px-7 text-base',
        xl: 'h-14 px-8 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
