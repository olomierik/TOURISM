import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid grid-cols-[auto_1fr] items-start gap-x-3',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive: 'border-destructive/30 bg-destructive/8 text-destructive',
        success: 'border-success/30 bg-success/8 text-success',
        info: 'border-primary/30 bg-primary/8 text-primary',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('col-start-2 font-medium', className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('col-start-2 text-sm [&_p]:leading-relaxed', className)} {...props} />
  );
}

export { Alert, AlertTitle, AlertDescription };
