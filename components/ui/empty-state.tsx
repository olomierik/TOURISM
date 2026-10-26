import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { SearchX } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * EmptyState — design.md §6.12.
 *
 * "icon 32 px, heading-md, 1 line of help, one action."
 *
 * One action, not three. The places this goes — search with no results, Saved
 * before anything is saved, a filter combination that matches nothing — are
 * moments where the visitor is already unsure what to do, and a panel of
 * choices is the wrong answer to that. §6.12 gives the directory's version
 * verbatim and it is a good model: "No safari operators match. Remove 'Licence
 * checked'?" — it names what failed and offers the single most likely fix.
 *
 * `one line of help` is a cap, not a suggestion. A paragraph here reads as an
 * apology.
 */
export function EmptyState({
  icon: Icon = SearchX,
  title,
  help,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  help?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <Icon className="size-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
      <h3 className="mt-4 text-heading-md font-semibold text-foreground">{title}</h3>
      {help && <p className="mt-1.5 max-w-prose text-body-sm text-muted-foreground">{help}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
