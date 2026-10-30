import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The band that opens every public content page — directory, destinations,
 * guides, events, planning tools, about, contact.
 *
 * Premium Safari (2026-10). Before this each page drew its own header: some on
 * a sand band, some on the canvas, eyebrows in grey on one page and gold on
 * the next, and on the narrow pages the breadcrumb sat at the container's left
 * edge while the title was centred 220px further in. One component makes the
 * opening of every page the same shape, and `width` keeps the breadcrumb, the
 * title and the body below on one left edge.
 *
 * Purely presentational: callers pass what they already rendered.
 */
export function PageHero({
  breadcrumbs,
  eyebrow,
  icon: Icon,
  title,
  lead,
  children,
  width = 'wide',
  className,
}: {
  /** The page's existing <Breadcrumbs />. */
  breadcrumbs?: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: LucideIcon;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** Under the lead: a scope switch, a search box. */
  children?: React.ReactNode;
  /** `medium` matches a `max-w-5xl` body, `narrow` a `max-w-3xl` one, `prose` a `max-w-2xl` one. */
  width?: 'wide' | 'medium' | 'narrow' | 'prose';
  className?: string;
}) {
  return (
    <header className={cn('relative isolate overflow-hidden border-b bg-surface-muted', className)}>
      <HeroContours />
      <div
        className={cn(
          'container-page pb-10 sm:pb-14',
          breadcrumbs ? 'pt-6 sm:pt-8' : 'pt-12 sm:pt-16',
        )}
      >
        <div
          className={cn(
            width === 'medium' && 'mx-auto max-w-5xl',
            width === 'narrow' && 'mx-auto max-w-3xl',
            width === 'prose' && 'mx-auto max-w-2xl',
          )}
        >
          {breadcrumbs && <div className="mb-8 sm:mb-10">{breadcrumbs}</div>}

          {eyebrow && (
            <p className="eyebrow mb-4">
              {Icon ? (
                <Icon className="size-3.5 shrink-0" aria-hidden />
              ) : (
                <span aria-hidden className="h-px w-8 bg-gold" />
              )}
              {eyebrow}
            </p>
          )}

          <h1 className="max-w-4xl text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            {title}
          </h1>

          {lead && (
            <p className="mt-4 max-w-2xl text-pretty text-body-lg text-muted-foreground">{lead}</p>
          )}

          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </header>
  );
}

/** Faint topographic lines on the right of the band: texture, not content. */
function HeroContours() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute -right-24 top-0 -z-10 hidden h-full w-[42rem] text-gold opacity-[0.12] md:block"
      viewBox="0 0 400 240"
      preserveAspectRatio="xMaxYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.8"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <path
          key={i}
          d={`M0 ${200 - i * 22} C 80 ${170 - i * 22}, 140 ${230 - i * 22}, 220 ${190 - i * 22} S 340 ${
            140 - i * 22
          }, 420 ${170 - i * 22}`}
        />
      ))}
    </svg>
  );
}
