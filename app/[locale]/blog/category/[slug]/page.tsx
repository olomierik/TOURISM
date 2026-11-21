import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { BLOG_CATEGORIES, getPosts } from '@/lib/blog/posts';
import { englishAlternates, requireEnglish } from '@/lib/blog/english-only';
import { formatDate } from '@/lib/format';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

type Params = { locale: Locale; slug: string };

export function generateStaticParams() {
  return BLOG_CATEGORIES.map((c) => ({ locale: 'en', slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const category = BLOG_CATEGORIES.find((c) => c.slug === slug);
  if (!category) return {};
  const posts = getPosts().filter((p) => p.category.slug === slug);
  return {
    title: `${category.name}: Tanzania travel articles`,
    description: `${posts.length} ${posts.length === 1 ? 'article' : 'articles'} on ${category.name.toLowerCase()} for a Tanzania trip, from ExploreTanzania.online.`,
    alternates: englishAlternates({ pathname: '/blog/category/[slug]', params: { slug } }),
    // A category with nothing published yet is not a page worth indexing.
    ...(posts.some((p) => p.published) ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function BlogCategory({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  requireEnglish(locale, { pathname: '/blog/category/[slug]', params: { slug } });
  setRequestLocale(locale);

  const category = BLOG_CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();
  const posts = getPosts().filter((p) => p.category.slug === slug);

  return (
    <div className="container-page py-section">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: 'Explore Tanzania', href: '/' },
          { label: 'Blog', href: '/blog' },
          { label: category.name },
        ]}
      />
      <h1 className="mt-6 text-4xl font-semibold">{category.name}</h1>
      {posts.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="mt-8 max-w-3xl divide-y">
          {posts.map((p) => (
            <li key={p.slug} className="py-5">
              <h2 className="font-display text-xl font-semibold">
                <Link href={{ pathname: '/blog/[slug]', params: { slug: p.slug } }} className="hover:text-primary">
                  {p.title}
                </Link>
              </h2>
              <p className="mt-1 text-body-sm text-muted-foreground">
                <time dateTime={p.updated}>{formatDate(p.updated, locale)}</time> · {p.readingMinutes} min read
              </p>
              <p className="mt-2 text-muted-foreground">{p.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
