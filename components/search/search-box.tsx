'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import { track } from '@/lib/analytics/track';

/**
 * The search box on /search.
 *
 * A plain form navigation rather than live results as you type. Every keystroke
 * against six tables is six queries per keystroke to answer a question nobody
 * finished asking, and a results list that reshuffles under the cursor is worse
 * to use than one that arrives when you press enter.
 *
 * Submitting puts the term in the URL, which makes a search shareable and
 * makes the back button behave.
 */
export function SearchBox({
  defaultValue,
  placeholder,
  label,
}: {
  defaultValue: string;
  placeholder: string;
  label: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (!q) return;
        track('search_started', { tool: 'universal' });
        router.push({ pathname: '/search', query: { q } });
      }}
      className="flex gap-2"
      role="search"
    >
      <label htmlFor="q" className="sr-only">
        {label}
      </label>
      <Input
        id="q"
        name="q"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        maxLength={120}
        autoComplete="off"
        className="flex-1"
      />
      <Button type="submit">
        <Search className="size-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">{label}</span>
      </Button>
    </form>
  );
}
