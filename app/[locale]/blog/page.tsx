import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { BLOG_CATEGORIES, draftsVisible, getPosts } from '@/lib/blog/posts';
import { englishAlternates, requireEnglish } from '@/lib/blog/english-only';
import { formatDate } from '@/lib/format';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Badge } from '@/components/ui/badge';

const TITLE = 'Tanzania Safari Planning Blog';
const DESCRIPTION =
  'Costs, parks, food and getting around in Tanzania, written from the prices and listings on ExploreTanzania.online. Free quotes · No booking fees.';

export function generateMetadata(): Metadata {
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { ...englishAlternates('/blog'), types: { 'application/rss+xml': '/blog/rss.xml' } },
  };
}

/** The blog index (SEO brief T10). English only; see lib/blog/english-only.ts. */
export default async function BlogIndex({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  requireEnglish(locale, '/blog');
  setRequestLocale(locale);

  const posts = getPosts();

  return (
    <div className="container-page py-section">
      <Breadcrumbs locale={locale} items={[{ label: 'Explore Tanzania', href: '/' }, { label: 'Blog' }]} />
      <header className="mt-6 max-w-2xl">
        <h1 className="text-4xl font-semibold sm:text-5xl">{TITLE}</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Practical answers for planning a trip: what it costs, which park fits, where to eat and how to get
          around. The figures come from the prices operators publish here and from our park pages.
        </p>
      </header>

      <nav aria-label="Categories" className="mt-8 flex flex-wrap gap-2">
        {BLOG_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={{ pathname: '/blog/category/[slug]', params: { slug: c.slug } }}
            className="inline-flex h-9 items-center rounded-pill border bg-surface px-4 text-body-sm font-medium hover:bg-secondary"
          >
            {c.name}
          </Link>
        ))}
      </nav>

      {posts.length === 0 ? (
        <p className="mt-10 rounded-lg border bg-surface p-8 text-center text-muted-foreground">
          The first posts are being written.
        </p>
      ) : (
        <ul className="mt-10 grid gap-6 md:grid-cols-2">
          {posts.map((p) => (
            <li key={p.slug} className="flex flex-col rounded-xl border bg-card p-6">
              <p className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                <span className="font-semibold uppercase tracking-wide">{p.category.name}</span>
                <span aria-hidden>·</span>
                <time dateTime={p.updated}>{formatDate(p.updated, locale)}</time>
                <span aria-hidden>·</span>
                <span>{p.readingMinutes} min read</span>
                {!p.published && draftsVisible && <Badge variant="demo">Draft</Badge>}
              </p>
              <h2 className="mt-3 font-display text-xl font-semibold leading-snug">
                <Link href={{ pathname: '/blog/[slug]', params: { slug: p.slug } }} className="hover:text-primary">
                  {p.title}
                </Link>
              </h2>
              <p className="mt-2 flex-1 text-body text-muted-foreground">{p.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
