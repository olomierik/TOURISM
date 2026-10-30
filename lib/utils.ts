import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge only knows Tailwind's stock font sizes. Without this list it
 * read the design system's own sizes (`text-overline`, `text-body-sm`,
 * `text-display-lg`…) as text *colours*, so `cn('text-overline',
 * 'text-muted-foreground')` silently dropped the size. That is why badges
 * rendered at 16px instead of 12px and destination names lost their white
 * colour over photographs. Naming them here makes size and colour stop
 * competing.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'display-2xl',
        'display-xl',
        'display-lg',
        'heading-xl',
        'heading-lg',
        'heading-md',
        'heading-sm',
        'body-lg',
        'body-article',
        'body',
        'body-sm',
        'label',
        'caption',
        'overline',
      ],
    },
  },
});

/** Merge conditional class names, with later Tailwind utilities winning conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
