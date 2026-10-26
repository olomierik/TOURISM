'use client';

import * as React from 'react';
import { Check, ChevronDown, MapPin, X } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * DestinationCombobox — design.md §6.3.
 *
 * "ARIA 1.2 combobox; type-ahead over the 46 destinations, grouped by region.
 * Multi-select renders selected items as removable chips. Keyboard: ↑/↓ moves
 * through the list, Enter selects, Backspace removes the last chip, Esc closes."
 *
 * The combobox pattern is written out rather than pulled from a library because
 * the one thing it has to get right is the thing libraries most often get
 * wrong: the input keeps DOM focus the whole time and `aria-activedescendant`
 * moves the *virtual* cursor through the listbox. Moving real focus into the
 * list is what makes a combobox stop accepting keystrokes halfway through a
 * word, and this control is the first field of the site's main conversion flow.
 *
 * A `<datalist>` would have been simpler and is not enough: it cannot group, it
 * cannot show a check, and on Android it does nothing at all.
 *
 * The hidden inputs at the end are what let this live inside the directory's
 * plain GET form and inside the quote form's server action without either of
 * them knowing a combobox is involved.
 */

export type ComboboxOption = {
  value: string;
  label: string;
  /** Section heading — "Northern circuit", "Coast & islands". */
  group?: string | null;
};

export function DestinationCombobox({
  name,
  options,
  label,
  placeholder,
  multiple = false,
  value,
  onChange,
  className,
  id: idProp,
  describedBy,
  removeLabel = 'Remove',
}: {
  name: string;
  options: ComboboxOption[];
  label: string;
  placeholder?: string;
  multiple?: boolean;
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
  id?: string;
  describedBy?: string;
  /** "Remove {name}" on a chip's clear button. */
  removeLabel?: string;
}) {
  const reactId = React.useId();
  const id = idProp ?? reactId;
  const listId = `${id}-listbox`;

  const [open, setOpen] = React.useState(false);
  const [queryText, setQueryText] = React.useState('');
  const [active, setActive] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const byValue = React.useMemo(
    () => new Map(options.map((o) => [o.value, o])),
    [options],
  );

  const matches = React.useMemo(() => {
    const q = queryText.trim().toLowerCase();
    const pool = multiple ? options.filter((o) => !value.includes(o.value)) : options;
    if (!q) return pool;
    // Prefix matches first: typing "ser" should put Serengeti above anything
    // that merely contains those letters.
    const starts = pool.filter((o) => o.label.toLowerCase().startsWith(q));
    const rest = pool.filter(
      (o) => !o.label.toLowerCase().startsWith(q) && o.label.toLowerCase().includes(q),
    );
    return [...starts, ...rest];
  }, [options, queryText, value, multiple]);

  // The virtual cursor goes back to the top whenever the list changes under
  // it. Adjusted during render rather than in an effect: an effect would let
  // one frame paint with the cursor pointing at a row that is no longer there,
  // and `aria-activedescendant` would name an id that does not exist.
  const listKey = `${queryText}:${open}`;
  const [prevListKey, setPrevListKey] = React.useState(listKey);
  if (prevListKey !== listKey) {
    setPrevListKey(listKey);
    setActive(0);
  }

  // Click-away. Pointerdown rather than click, so a tap outside closes before
  // the tapped control runs — otherwise the first tap only dismisses the list.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  function pick(option: ComboboxOption) {
    if (multiple) {
      onChange([...value, option.value]);
      setQueryText('');
      inputRef.current?.focus();
    } else {
      onChange([option.value]);
      setQueryText(option.label);
      setOpen(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (matches.length === 0 ? 0 : (i + step + matches.length) % matches.length));
      return;
    }
    if (e.key === 'Enter' && open && matches[active]) {
      e.preventDefault();
      pick(matches[active]);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    // §6.3: Backspace on an empty input removes the last chip.
    if (e.key === 'Backspace' && multiple && queryText === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  // Group headings, computed once rather than tracked with a mutable cursor
  // inside the map. Same output, and it keeps the flat list the keyboard walks
  // identical to the grouped list the eye reads — the headings are decorations
  // on rows, not rows of their own.
  const headings = React.useMemo(
    () => matches.map((o, i) => (i === 0 || o.group !== matches[i - 1].group ? o.group : null)),
    [matches],
  );

  const selectedSingle = !multiple && value[0] ? byValue.get(value[0]) : null;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <label htmlFor={id} className="mb-1.5 block text-label font-semibold text-foreground">
        {label}
      </label>

      <div
        className={cn(
          'flex min-h-12 w-full flex-wrap items-center gap-1.5 rounded-sm border-control bg-surface px-3 py-1.5',
          'focus-within:border-primary',
        )}
      >
        {multiple &&
          value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-pill bg-primary-subtle py-1 pl-2.5 pr-1 text-body-sm font-semibold text-primary"
            >
              {byValue.get(v)?.label ?? v}
              <button
                type="button"
                aria-label={`${removeLabel} ${byValue.get(v)?.label ?? v}`}
                onClick={() => onChange(value.filter((x) => x !== v))}
                className="flex size-5 items-center justify-center rounded-pill hover:bg-primary/20"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          ))}

        <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `${id}-o-${active}` : undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          // 16px, so iOS does not zoom the page on focus (§6.3).
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          placeholder={value.length && multiple ? '' : placeholder}
          value={queryText}
          onChange={(e) => {
            setQueryText(e.target.value);
            setOpen(true);
            if (!multiple && value.length) onChange([]);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute inset-x-0 top-full z-[var(--z-dropdown)] mt-1 max-h-72 overflow-y-auto rounded-lg border bg-popover py-1 shadow-[var(--elev-lg)]"
        >
          {matches.length === 0 && (
            <li className="px-3 py-2.5 text-body-sm text-muted-foreground">{placeholder}</li>
          )}
          {matches.map((option, i) => {
            const heading = headings[i];
            return (
              <React.Fragment key={option.value}>
                {heading && (
                  <li
                    role="presentation"
                    className="px-3 pb-1 pt-2.5 text-overline font-semibold uppercase text-muted-foreground"
                  >
                    {heading}
                  </li>
                )}
                <li
                  id={`${id}-o-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // Mouse down would blur the input before the click lands.
                  onPointerDown={(e) => {
                    e.preventDefault();
                    pick(option);
                  }}
                  onPointerEnter={() => setActive(i)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-body',
                    i === active && 'bg-secondary',
                  )}
                >
                  {option.label}
                  {value.includes(option.value) && (
                    <Check className="size-4 text-primary" aria-hidden />
                  )}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      )}

      {/* The value, for a plain form submit. One input per selection, so a
          multi-select arrives as repeated keys the server reads with getAll. */}
      {(multiple ? value : selectedSingle ? [selectedSingle.value] : []).map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
    </div>
  );
}
