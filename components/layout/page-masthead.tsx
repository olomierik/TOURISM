import { cn } from '@/lib/utils';

/**
 * The band that opens every signed-in workspace page (dashboard, admin,
 * account). Premium Safari (2026-10): a sand surface the full width of the
 * page, a short gold rule, and the page title in the display serif, so the
 * private pages read as the same house as the public ones.
 *
 * Purely presentational. Callers pass what they already rendered — title,
 * subtitle, badges, a link — and nothing here fetches or decides.
 */
export function PageMasthead({
  title,
  subtitle,
  meta,
  aside,
  containerClassName,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** A row under the title: badges, an email address. */
  meta?: React.ReactNode;
  /** Right-hand side on wide screens: a link or an action. */
  aside?: React.ReactNode;
  /** Match the width of the page body below, e.g. `max-w-2xl`. */
  containerClassName?: string;
}) {
  return (
    <div className="border-b bg-surface-muted">
      <div className={cn('container-page py-8 sm:py-10', containerClassName)}>
        <span aria-hidden className="mb-4 block h-0.5 w-12 rounded-full bg-gold" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            )}
            {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
      </div>
    </div>
  );
}

/** The side menu's frame on wide screens; a plain scroll row on phones. */
export const workspaceAsideClass =
  'md:sticky md:top-24 md:self-start md:rounded-2xl md:border md:bg-card md:p-2 md:shadow-xs';

/** One menu entry, shared by the dashboard and admin menus so they match. */
export function workspaceNavItemClass(active: boolean) {
  return cn(
    'relative flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors',
    'md:before:absolute md:before:inset-y-2 md:before:left-0 md:before:w-0.5 md:before:rounded-full md:before:bg-gold md:before:opacity-0 md:before:transition-opacity',
    active
      ? 'bg-primary-subtle text-primary md:before:opacity-100'
      : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
  );
}
