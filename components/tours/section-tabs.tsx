'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * The tab bar on a tour page: Overview, Day by day, Rates, Inclusions,
 * Getting there, Offered by — SafariBookings' structure.
 *
 * Links to sections rather than tabs that hide content. Every section stays
 * in the HTML, so a crawler reads the whole tour and a reader can scroll it
 * straight through; the bar is a way to jump, and it shows where you are.
 * Hidden panels would make five sixths of the page invisible to search for
 * the sake of a look.
 *
 * Without JavaScript it is a row of plain anchor links, which still works.
 */
export function SectionTabs({
  items,
  label,
}: {
  items: Array<{ id: string; label: string }>;
  label: string;
}) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;

    // A section is current once its top passes just below the sticky bars.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-140px 0px -55% 0px', threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label={label}
      className="sticky top-[var(--header-h)] z-[var(--z-sticky)] border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
    >
      <ul className="scrollbar-none container-page flex gap-1 overflow-x-auto">
        {items.map((i) => (
          <li key={i.id} className="shrink-0">
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? 'location' : undefined}
              onClick={() => setActive(i.id)}
              className={cn(
                'inline-flex min-h-12 items-center border-b-2 px-3 text-sm font-medium transition-colors',
                active === i.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
