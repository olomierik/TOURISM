import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * "Include Kenya, Uganda and Rwanda" — design.md §9.3.
 *
 * "Default country filter = Tanzania on all listing surfaces, events, hidden
 * gems, when-to-go and destinations. Other countries remain reachable via a
 * switch and keep their URLs."
 *
 * The site is called Explore Tanzania, every page title says Tanzania, and
 * 1,521 of 2,618 approved listings are Tanzanian — but the destinations index,
 * the events list and the hidden-gems page were all showing four countries by
 * default. That is not breadth, it is a directory that cannot say what it is
 * about, and it is why the Tanzanian half of the content competed with Kenyan
 * and Rwandan entries for the same rows.
 *
 * A link rather than a checkbox on purpose. Each scope has to stay its own
 * crawlable URL (§13), and a GET link is the one control that works before
 * hydration, keeps the back button meaningful, and can be shared.
 */
export async function ScopeSwitch({
  /** The current page, so the link returns to it with the scope flipped. */
  href,
  /** True when the wider scope is active. */
  all,
  className,
}: {
  href: React.ComponentProps<typeof Link>['href'];
  all: boolean;
  className?: string;
}) {
  const t = await getTranslations('directory');

  return (
    <p className={cn('text-body-sm text-muted-foreground', className)}>
      <Link
        href={href}
        rel="nofollow"
        className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline"
      >
        <span
          aria-hidden
          className={cn(
            'flex h-5 w-9 shrink-0 items-center rounded-pill p-0.5 transition-colors',
            all ? 'bg-primary' : 'bg-surface-sunken',
          )}
        >
          <span
            className={cn(
              'size-4 rounded-pill bg-white shadow-[var(--elev-xs)] transition-transform',
              all && 'translate-x-4',
            )}
          />
        </span>
        {t('includeNeighbours')}
      </Link>
    </p>
  );
}
