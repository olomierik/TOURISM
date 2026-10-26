'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Content that arrives as it is scrolled to.
 *
 * **Why this and not more.** The three competitors examined — SafariBookings,
 * TourRadar, Much Better Adventures — differ enormously in polish, and the one
 * thing the polished ones share is not an effect. It is that nothing on the
 * page is *static while you move*: sections settle in, cards lift under the
 * cursor, images scale a little behind their frame. Explore Tanzania had none
 * of that, and a page where nothing responds reads as a document rather than a
 * product, whatever the typography is doing.
 *
 * So: one primitive, used widely, rather than a catalogue of effects used
 * once each. A short rise and fade as a block enters the viewport. That is
 * the whole vocabulary.
 *
 * **What it refuses to do**, because these are what make motion feel cheap:
 *
 * - It never moves more than 12px. Long travel reads as a slideshow and costs
 *   a repaint of half the screen.
 * - It never animates anything but `opacity` and `transform`, so it cannot
 *   trigger layout and cannot move anything else on the page. CLS stays 0.
 * - It never hides content from a crawler or a reader without JavaScript: the
 *   markup is always present and visible by default, and the hidden state is
 *   applied only once this component has mounted and confirmed it can animate.
 *   Content that is invisible until a script runs is an SEO liability and an
 *   accessibility one, and it is the most common way this pattern is got
 *   wrong.
 * - It runs once. Re-animating on every scroll past is motion sickness as a
 *   feature.
 *
 * Under `prefers-reduced-motion: reduce` nothing animates at all — not a
 * shortened version, nothing. §3.5 asks for durations of 0 under that query,
 * and a 12px slide is exactly the vestibular trigger the setting exists for.
 */
export function Reveal({
  children,
  className,
  /** Stagger within a group, in milliseconds. Keep the total under ~200ms. */
  delay = 0,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const ref = React.useRef<HTMLElement>(null);
  const [state, setState] = React.useState<'static' | 'hidden' | 'shown'>('static');

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Decided here rather than in CSS so the "no JavaScript" and "reduced
    // motion" paths both land on plain visible content with no classes to
    // undo.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof IntersectionObserver === 'undefined') return;

    // Already on screen at mount — the hero, the first band. Animating those
    // means the page opens by fading in, which delays the first thing somebody
    // came to read.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return;

    setState('hidden');

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setState('shown');
        observer.disconnect();
      },
      // Fires a little before the block's top edge arrives, so it has finished
      // settling by the time it is actually being looked at.
      { rootMargin: '0px 0px -12% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn(
        state !== 'static' &&
          // `translate`, not `transform`. Tailwind v4 implements translate-y-*
          // through the standalone `translate` property, so a transition on
          // `transform` covers nothing and the rise snaps into place while the
          // fade animates — measured: translate 0px 12px, transform none.
          'transition-[opacity,translate] duration-[var(--dur-slow)] ease-[var(--ease-out)] motion-reduce:transition-none',
        state === 'hidden' && 'translate-y-3 opacity-0',
        state === 'shown' && 'translate-y-0 opacity-100',
        className,
      )}
      style={state === 'hidden' && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
