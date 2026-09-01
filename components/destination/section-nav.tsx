import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';

/**
 * Jump links across a destination page.
 *
 * A destination carries eleven sections — photos, operators, packages, things
 * to do, a map, costs, month-by-month conditions, quieter alternatives, guides.
 * That is a good page and a long one, and the reader who came for "what does a
 * day here cost" should not have to scroll past four of them to find out.
 *
 * It is also the internal linking the page was missing. Anchors to real section
 * ids give a crawler the page's structure rather than one undifferentiated wall,
 * and they are the links a search result's sitelinks are built from.
 *
 * Sections that rendered nothing are not listed. A jump link to an empty
 * heading is worse than no link — it moves the page and shows nothing, which
 * reads as broken rather than as absent.
 */
export async function DestinationSectionNav({
  locale,
  has,
}: {
  locale: Locale;
  /** Which sections actually rendered on this destination. */
  has: {
    photos: boolean;
    operators: boolean;
    packages: boolean;
    thingsToDo: boolean;
    costs: boolean;
    seasons: boolean;
    alternatives: boolean;
    guides: boolean;
  };
}) {
  const t = await getTranslations({ locale, namespace: 'destination.nav' });

  const items = [
    { id: 'photos', show: has.photos },
    { id: 'operators', show: has.operators },
    { id: 'packages', show: has.packages },
    { id: 'things-to-do', show: has.thingsToDo, key: 'thingsToDo' },
    { id: 'costs', show: has.costs },
    { id: 'seasons', show: has.seasons },
    { id: 'alternatives', show: has.alternatives },
    { id: 'guides', show: has.guides },
  ] as const;

  const visible = items.filter((i) => i.show);
  // One link is not navigation.
  if (visible.length < 2) return null;

  // A union rather than a const array: next-intl's typed keys need the type,
  // and nothing here needs the values at runtime.
  type Label =
    | 'photos'
    | 'operators'
    | 'packages'
    | 'thingsToDo'
    | 'costs'
    | 'seasons'
    | 'alternatives'
    | 'guides';

  return (
    <nav
      aria-label={t('label')}
      className="sticky top-[var(--header-h)] z-20 border-y bg-card/95 backdrop-blur"
    >
      {/* Scrolls horizontally on a phone rather than wrapping to three rows —
          a nav that takes a third of a small screen is not helping. */}
      <ul className="container-page flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((item) => {
          const key = ('key' in item ? item.key : item.id) as Label;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="inline-block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {t(key)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
