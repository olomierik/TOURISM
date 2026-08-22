import { getTranslations } from 'next-intl/server';
import * as Icons from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { getCategories } from '@/lib/queries/taxonomy';
import { Section } from '@/components/layout/section';
import type { Locale } from '@/i18n/routing';

/**
 * Resolves the icon name stored on the category row.
 *
 * Icons are data rather than code so an admin can add a category without a
 * deploy; the fallback keeps an unknown or misspelled name from crashing the page.
 */
function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon =
    (name && (Icons as unknown as Record<string, typeof Icons.Compass>)[name]) ||
    Icons.Compass;
  return <Icon className={className} aria-hidden />;
}

export async function CategoryGrid({ locale }: { locale: Locale }) {
  const [categories, t] = await Promise.all([
    getCategories(locale),
    getTranslations('home.categories'),
  ]);

  if (categories.length === 0) return null;

  return (
    <Section title={t('title')} subtitle={t('subtitle')} muted>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={{ pathname: '/directory', query: { category: category.slug } }}
            className="group flex items-start gap-4 rounded-2xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <CategoryIcon name={category.icon} className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-medium leading-snug">{category.name}</span>
              {category.summary && (
                <span className="mt-1 block text-sm text-muted-foreground">
                  {category.summary}
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}
