'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export type TaxonomyOption = { id: string; name: string };

/**
 * Multi-select for the categories a business works in and the places it serves.
 *
 * This is the most consequential thing on the profile form and it did not exist:
 * a listing with no category and no destination is unreachable from every
 * browsing path on the site. It can be found only by its own URL or by scrolling
 * the unfiltered directory, which means it earns no search traffic and receives
 * no matched enquiries — the lead matcher resolves a category and a destination
 * before it looks at anything else.
 *
 * Checkboxes rather than a fancy combobox. They submit natively as repeated form
 * fields, need no client state to be readable by the server, and work with a
 * keyboard and a screen reader without any work on my part.
 */
export function TaxonomyPicker({
  name,
  label,
  hint,
  options,
  selected,
  primaryNote,
}: {
  name: string;
  label: string;
  hint?: string;
  options: TaxonomyOption[];
  selected: string[];
  /** Shown when order matters, i.e. the first pick becomes the primary one. */
  primaryNote?: string;
}) {
  const t = useTranslations('dashboard');
  const [chosen, setChosen] = useState<string[]>(selected);

  function toggle(id: string) {
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{label}</legend>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = chosen.includes(o.id);
          return (
            <label
              key={o.id}
              className={cn(
                'cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:bg-secondary',
              )}
            >
              <input
                type="checkbox"
                name={name}
                value={o.id}
                checked={active}
                onChange={() => toggle(o.id)}
                className="sr-only"
              />
              <span className="flex items-center gap-1.5">
                {active && <Check className="size-3.5" aria-hidden />}
                {o.name}
              </span>
            </label>
          );
        })}
      </div>

      {chosen.length === 0 && (
        // Stated plainly rather than left to be discovered. An owner who saves
        // with nothing selected gets a listing nobody can find, and has no way
        // to know that from the screen.
        <p className="text-xs font-medium text-warning-strong">{t('taxonomyEmpty')}</p>
      )}

      {primaryNote && chosen.length > 1 && (
        <p className="text-xs text-muted-foreground">{primaryNote}</p>
      )}
    </fieldset>
  );
}
