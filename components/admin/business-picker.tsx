'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Search, X } from 'lucide-react';

import { lookupBusinesses, type BusinessLookupHit } from '@/lib/admin/boosts';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Search-and-pick for any business in the database, every country and status.
 *
 * Writes the choice into hidden inputs named `name`, so it drops into a plain
 * server-action form: one input when `multiple` is off, one per pick when it
 * is on. Lookups run through a server action that re-checks the admin role.
 */
export function BusinessPicker({
  name,
  label,
  hint,
  multiple = false,
  max = 10,
}: {
  name: string;
  label: string;
  hint?: string;
  multiple?: boolean;
  max?: number;
}) {
  const t = useTranslations('admin.picker');
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<BusinessLookupHit[]>([]);
  const [picked, setPicked] = useState<BusinessLookupHit[]>([]);
  const [pending, startTransition] = useTransition();
  // The term the current `hits` answer, so "no match" is said only about a
  // search that has actually come back — not during the debounce.
  const [answered, setAnswered] = useState('');
  const latest = useRef('');

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) return;
    const handle = setTimeout(() => {
      latest.current = q;
      startTransition(async () => {
        const result = await lookupBusinesses(q);
        // A slow answer to an older keystroke must not overwrite a newer one.
        if (latest.current === q) {
          setHits(result);
          setAnswered(q);
        }
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [term]);

  const choose = (hit: BusinessLookupHit) => {
    setPicked((prev) => {
      if (prev.some((p) => p.id === hit.id)) return prev;
      return multiple ? [...prev, hit].slice(0, max) : [hit];
    });
    setTerm('');
    setHits([]);
    setAnswered('');
  };

  const q = term.trim();
  const shown = q.length >= 2 && answered === q ? hits : [];

  const id = `picker-${name}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      {picked.map((p) => (
        <input key={p.id} type="hidden" name={name} value={p.id} />
      ))}

      {picked.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {picked.map((p) => (
            <li
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 py-1 pl-2.5 pr-1 text-sm"
            >
              <span className="font-medium">{p.name}</span>
              {p.place && <span className="text-xs text-muted-foreground">{p.place}</span>}
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setPicked((prev) => prev.filter((x) => x.id !== p.id))}
                aria-label={t('remove', { name: p.name })}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {(multiple || picked.length === 0) && (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id={id}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t('placeholder')}
            className="pl-9"
            autoComplete="off"
            // Enter in the search box should search, not submit the form
            // around it with nothing picked.
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (shown[0]) choose(shown[0]);
              }
            }}
          />
          {pending && (
            <Loader2
              className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden
            />
          )}

          {shown.length > 0 && (
            <ul
              className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-lg border bg-surface shadow-[var(--elev-md)]"
              role="listbox"
            >
              {shown.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted"
                    onClick={() => choose(h)}
                  >
                    <span className="text-sm font-medium">{h.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {[
                        h.place,
                        h.email ?? t('noEmail'),
                        h.claimed ? t('claimed') : null,
                        h.status !== 'approved' ? h.status : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q.length >= 2 && answered === q && !pending && hits.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">{t('none')}</p>
          )}
        </div>
      )}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
