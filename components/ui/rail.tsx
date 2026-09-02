'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * A horizontally scrolling row of cards.
 *
 * The single biggest lever against vertical scrolling on this site. The
 * destinations page renders 46 cards in a three-column grid and runs to seven
 * screens; the same 46 in rails are four screens with more of them visible at
 * once, because a rail spends horizontal space — which a wide screen has going
 * spare — instead of vertical space, which is the thing being rationed.
 *
 * Built on native scrolling rather than a transform.
 *
 * That is not a shortcut, it is the accessible option. Native scroll gives
 * momentum on a trackpad, swipe on a phone, arrow keys and Page Up/Down from
 * the keyboard, and a real scrollbar for anybody who wants one — all of it for
 * free, none of it reimplemented and none of it subtly wrong. A transform-based
 * carousel has to rebuild every one of those and usually rebuilds three.
 *
 * The arrows are progressive enhancement on top: they appear only when there is
 * something to scroll to, and they disappear at each end, so a control is never
 * shown that would do nothing.
 */
export function Rail({
  children,
  className,
  itemClassName,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** Applied to each child, so callers set the card width in one place. */
  itemClassName?: string;
  /** Names the region for a screen reader. */
  label: string;
}) {
  const t = useTranslations('common');
  const track = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    // A pixel of slack: sub-pixel layout means scrollLeft rarely reaches the
    // exact maximum, and a "next" arrow that never switches off at the end is
    // a control that lies.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    // Content arrives after mount (images, fonts, a locale swap), and any of
    // them changes whether there is anything to scroll to.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure]);

  function step(direction: 1 | -1) {
    const el = track.current;
    if (!el) return;
    // Roughly a screenful, so a press moves a satisfying amount without
    // skipping past cards the reader has not seen.
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  }

  const scrollable = !(atStart && atEnd);

  return (
    <div className={cn('relative', className)}>
      <div
        ref={track}
        onScroll={measure}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={cn(
          'flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2',
          // The scrollbar is hidden on the rail itself because the arrows and
          // the partially visible next card already say it scrolls, and a
          // horizontal bar under every rail on the page is visual noise. The
          // element keeps focus and keyboard scrolling either way.
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          // Bleeds to the viewport edge on small screens so a card is cut off
          // rather than ending flush — the clearest signal that there is more.
          '-mx-4 scroll-px-4 px-4 sm:mx-0 sm:scroll-px-0 sm:px-0',
        )}
      >
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div key={i} className={cn('shrink-0 snap-start', itemClassName)}>
                {child}
              </div>
            ))
          : children}
      </div>

      {scrollable && (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={atStart}
            aria-label={t('railPrevious')}
            className={cn(
              'absolute -left-4 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full border bg-background/95 shadow-md transition-opacity lg:grid',
              atStart && 'pointer-events-none opacity-0',
            )}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={atEnd}
            aria-label={t('railNext')}
            className={cn(
              'absolute -right-4 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full border bg-background/95 shadow-md transition-opacity lg:grid',
              atEnd && 'pointer-events-none opacity-0',
            )}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
