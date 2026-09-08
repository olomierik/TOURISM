import { getTranslations } from 'next-intl/server';
import * as Icons from 'lucide-react';

import { Section } from '@/components/layout/section';
import { RowList, Row } from '@/components/ui/row-list';
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
 * The six things this site holds, as a list.
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
    <Section title={t('title')} subtitle={t('subtitle')} muted>
      {/* Three columns, because six rows split evenly into three twos and a
          row is wide and short where a card was tall and narrow. */}
      <RowList columns={3}>
        {categories.map((category) => (
          <Row
            key={category.id}
            href={{ pathname: '/directory', query: { category: category.slug } }}
            icon={<CategoryIcon name={category.icon} />}
            title={category.name}
            meta={n.format(category.businessCount)}
            description={category.summary}
          />
        ))}
      </RowList>
    </Section>
  );
}
