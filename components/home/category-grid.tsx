import { getTranslations } from 'next-intl/server';
import * as Icons from 'lucide-react';

import { Section } from '@/components/layout/section';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { CategoryWithCount } from '@/lib/queries/taxonomy';
import type { Locale } from '@/i18n/routing';

/**
 * Resolves the icon name stored on the category row.
 *
 * Icons are data rather than code so an admin can add a category without a
 * deploy; the fallback keeps an unknown or misspelled name from crashing the page.
 */
function CategoryIcon({ name }: { name: string | null }) {
  const Icon =
    (name && (Icons as unknown as Record<string, typeof Icons.Compass>)[name]) ||
    Icons.Compass;
  return <Icon aria-hidden />;
}

/**
 * The six things this site holds, as tiles again (Savanna Modern, 2026-10):
 * small ones, six in a row on a desktop, with the count the list added. The
 * history below is why they were a list in between.
 *
 * Was six `rounded-2xl border bg-card p-5` cards, each wrapping a 44px filled
 * icon tile beside a name and a two-line summary — 113px per card, 452px for
 * the section, to carry six links. A card frames a photograph and there is no
 * photograph here; the border, the fill and the tile were chrome around text.
 *
 * Two things the rows gained by losing the card. The count is now shown, which
 * a tile had no room for and which is the difference between "Hotels" as a
 * label and "Hotels · 847" as a reason to click. And the whole row is the
 * target rather than the card's inner link, so the tap area went up while the
 * height came down.
 *
 * `categories` arrives as a prop rather than being fetched here. The homepage
 * already calls getCategoriesWithCounts for the hero's tabs, so this component
 * fetching getCategories separately meant two queries for one taxonomy on a
 * ~550ms round trip.
 */
export async function CategoryGrid({
  locale,
  categories,
}: {
  locale: Locale;
  categories: CategoryWithCount[];
}) {
  const t = await getTranslations({ locale, namespace: 'home.categories' });

  if (categories.length === 0) return null;

  const n = new Intl.NumberFormat(locale);

  return (
    <Section eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} size="lg">
      {/* Savanna Modern: tiles with a tinted icon, the name and the count.
          Two across on a phone, three on a tablet, six in a row from lg, so
          the six categories are one glance on a desktop. */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {categories.map((category, i) => (
          <li key={category.id}>
            <Link
              href={{ pathname: '/directory', query: { category: category.slug } }}
              className="group flex h-full flex-col gap-4 rounded-[1.25rem] border bg-card p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-md"
            >
              <span
                className={cn(
                  'flex size-12 items-center justify-center rounded-2xl text-foreground [&_svg]:size-6',
                  TINTS[i % TINTS.length],
                )}
              >
                <CategoryIcon name={category.icon} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-bold leading-snug">{category.name}</span>
                <span className="text-sm text-muted-foreground">
                  {t('count', { count: category.businessCount, formatted: n.format(category.businessCount) })}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** One soft tint per tile, cycling: the brand's colours at low strength. */
const TINTS = ['bg-accent/12', 'bg-primary/12', 'bg-success/14', 'bg-warning/25', 'bg-primary/8', 'bg-accent/8'];
