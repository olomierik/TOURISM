import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { Link, getPathname } from '@/i18n/navigation';
import { draftsVisible, getPost, getPublishedPosts, tableOfContents } from '@/lib/blog/posts';
import { englishAlternates, requireEnglish } from '@/lib/blog/english-only';
import { absoluteUrl } from '@/lib/seo';
import { formatDate, formatPrice } from '@/lib/format';
import { getDestinations } from '@/lib/queries/taxonomy';
import { getPackagesBySlugs } from '@/lib/queries/packages';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { DestinationCard } from '@/components/cards/destination-card';
import { AuthorBox, PostBody, QuoteBox, ShareLinks } from '@/components/blog/post-parts';
import { Badge } from '@/components/ui/badge';

type Params = { locale: Locale; slug: string };

/** Published posts build at deploy; a draft renders on demand, only off production. */
export function generateStaticParams() {
  return getPublishedPosts().map((p) => ({ locale: 'en', slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const href = { pathname: '/blog/[slug]' as const, params: { slug } };
  return {
    title: post.title,
    description: post.description,
    alternates: englishAlternates(href),
    // A draft is never indexed, even where it is visible.
    ...(post.published ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      modifiedTime: post.updated,
      authors: [post.author.name],
      ...(post.hero ? { images: [{ url: post.hero.src, alt: post.hero.alt }] } : {}),
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  requireEnglish(locale, { pathname: '/blog/[slug]', params: { slug } });
  setRequestLocale(locale);

  const post = getPost(slug);
  if (!post) notFound();

  const [destinations, packages] = await Promise.all([
    post.relatedDestinations.length ? getDestinations(locale) : Promise.resolve([]),
    post.relatedPackages.length ? getPackagesBySlugs(post.relatedPackages, locale) : Promise.resolve([]),
  ]);
  const related = post.relatedDestinations
    .map((s) => destinations.find((d) => d.slug === s))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const url = absoluteUrl(getPathname({ href: { pathname: '/blog/[slug]', params: { slug } }, locale: 'en' }));
  const toc = tableOfContents(post.body);
  const quoteFor = related[0];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    url,
    mainEntityOfPage: url,
    datePublished: post.date,
    dateModified: post.updated,
    inLanguage: 'en',
    author: {
      '@type': 'Person',
      name: post.author.name,
      url: absoluteUrl(getPathname({ href: { pathname: '/authors/[slug]', params: { slug: post.author.slug } }, locale: 'en' })),
      ...(post.author.sameAs?.length ? { sameAs: post.author.sameAs } : {}),
    },
    publisher: { '@type': 'Organization', name: 'ExploreTanzania.online', url: absoluteUrl('/') },
    ...(post.hero ? { image: post.hero.src } : {}),
    keywords: post.tags.join(', '),
  };

  return (
    <div className="container-page py-section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs
        locale={locale}
        items={[
          { label: 'Explore Tanzania', href: '/' },
          { label: 'Blog', href: '/blog' },
          { label: post.category.name, href: { pathname: '/blog/category/[slug]', params: { slug: post.category.slug } } },
          { label: post.title },
        ]}
      />

      <article className="mx-auto mt-8 max-w-[42rem]">
        <header>
          {!post.published && draftsVisible && (
            <p className="mb-4 rounded-lg border border-[var(--warning-800)]/30 bg-[var(--warning-50)] p-3 text-body-sm text-[var(--warning-800)]">
              <Badge variant="demo" className="me-2">Draft</Badge>
              Visible on previews only. Figures marked ⚠ VERIFY need checking before this is published.
            </p>
          )}
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">{post.title}</h1>
          <p className="mt-5 text-xl leading-relaxed text-muted-foreground">{post.description}</p>
          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-b pb-6 text-body-sm text-muted-foreground">
            <span>
              By{' '}
              <Link
                href={{ pathname: '/authors/[slug]', params: { slug: post.author.slug } }}
                className="font-medium text-foreground hover:text-primary"
              >
                {post.author.name}
              </Link>
            </span>
            <span aria-hidden>·</span>
            <span>
              Updated <time dateTime={post.updated}>{formatDate(post.updated, locale)}</time>
            </span>
            <span aria-hidden>·</span>
            <span>{post.readingMinutes} min read</span>
          </p>
        </header>

        {toc.length >= 3 && (
          <nav aria-label="On this page" className="mt-8 rounded-lg border bg-surface-muted p-4">
            <p className="text-label font-semibold">On this page</p>
            <ol className="mt-3 space-y-1.5">
              {toc.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`} className="text-body-sm text-primary underline-offset-4 hover:underline">
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <PostBody body={post.body} showNotes={draftsVisible} />

        <QuoteBox
          heading={quoteFor ? `Planning ${quoteFor.name}?` : 'Planning a trip?'}
          body="Describe your trip once and up to five local operators reply with their own quotes. Free, with no booking fees."
          cta="Get free quotes"
          destination={quoteFor?.slug}
        />

        {packages.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold">Tours mentioned</h2>
            <ul className="mt-4 divide-y rounded-lg border">
              {packages.map((p) => (
                <li key={p.slug} className="flex flex-wrap items-baseline justify-between gap-2 p-4">
                  <Link
                    href={{ pathname: '/packages/[slug]', params: { slug: p.slug } }}
                    className="font-medium hover:text-primary"
                  >
                    {p.title}
                  </Link>
                  <span className="text-body-sm tabular-nums text-muted-foreground">
                    {p.durationDays ? `${p.durationDays} days` : ''}
                    {p.priceFrom ? ` · from ${formatPrice(p.priceFrom, p.currency ?? 'USD', locale)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ShareLinks url={url} title={post.title} label="Share" />
        <AuthorBox author={post.author} label="Written by" />
      </article>

      {related.length > 0 && (
        <section className="mx-auto mt-16 max-w-5xl">
          <h2 className="text-2xl font-semibold">Places in this post</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((d) => (
              <DestinationCard key={d.slug} destination={d} size="compact" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
