'use client';

import { useId, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The directory's filter controls, folded on phones.
 *
 * On a phone the six selects, the checkbox and the submit button wrap to four
 * rows, about 230px, and they sit under a search card that already asks for a
 * category and a place. Folded behind one button they cost one row until
 * somebody wants them. From `sm` up the row fits and is always shown.
 *
 * The controls stay in the document either way (hidden, not unmounted), so the
 * form submits every field whether or not it was opened.
 */
export function FiltersDisclosure({
  label,
  activeCount,
  children,
}: {
  label: string;
  /** Filters currently applied, shown on the button so a folded panel is not a hidden one. */
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between sm:hidden"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="size-4" aria-hidden />
          {label}
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </Button>
      <div
        id={id}
        data-open={open}
        className="hidden flex-wrap items-center gap-2 data-[open=true]:mt-3 data-[open=true]:flex sm:flex sm:data-[open=true]:mt-0"
      >
        {children}
      </div>
    </>
  );
}
