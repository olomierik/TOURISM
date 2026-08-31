'use client';

import { X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { useRouter } from '@/i18n/navigation';

/**
 * Drops one operator from the comparison.
 *
 * The comparison is a query parameter, so removing a column is a navigation
 * rather than state — which means the back button undoes it and the resulting
 * URL is still the shareable thing it was before.
 */
export function CompareRemove({ slug, label }: { slug: string; label: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const remaining = (searchParams.get('ops') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== slug);

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() =>
        router.replace({
          pathname: '/compare',
          query: remaining.length ? { ops: remaining.join(',') } : {},
        })
      }
      className="flex items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground"
    >
      <X className="size-3" aria-hidden />
    </button>
  );
}
