import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { Link, getPathname } from '@/i18n/navigation';
import { AUTHORS, authorBySlug } from '@/lib/content/authors';
import { getPosts } from '@/lib/blog/posts';
import { englishAlternates, requireEnglish } from '@/lib/blog/english-only';
import { absoluteUrl } from '@/lib/seo';
import { formatDate } from '@/lib/format';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

type Params = { locale: Locale; slug: string };

/**
 * An author's page (SEO brief T9/T10): who they are and what they wrote, so
 * an article's byline leads somewhere a reader and a search engine can check.
 */
export function generateStaticParams() {
  return AUTHORS.map((a) => ({ locale: 'en', slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const author = authorBySlug(slug);
  if (!author) return {};
  return {
    title: `${author.name}, ${author.role}`,
    description: author.bio.slice(0, 160),
    alternates: englishAlternates({ pathname: '/authors/[slug]', params: { slug } }),
  };
}

export default async function AuthorPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  requireEnglish(locale, { pathname: '/authors/[slug]', params: { slug } });
  setRequestLocale(locale);

  const author = authorBySlug(slug);
  if (!author) notFound();
  const posts = getPosts().filter((p) => p.author.slug === slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: author.name,
      jobTitle: author.role,
      description: author.bio,
      url: absoluteUrl(getPathname({ href: { pathname: '/authors/[slug]', params: { slug } }, locale: 'en' })),
      ...(author.sameAs?.length ? { sameAs: author.sameAs } : {}),
    },
  };

  return (
    <div className="container-page py-section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs
        locale={locale}
        items={[{ label: 'Explore Tanzania', href: '/' }, { label: 'Blog', href: '/blog' }, { label: author.name }]}
      />
      <div className="mt-6 max-w-2xl">
        <h1 className="text-4xl font-semibold">{author.name}</h1>
        <p className="mt-1 text-lg text-muted-foreground">{author.role}</p>
        <p className="mt-5 text-lg leading-relaxed">{author.bio}</p>
      </div>
      {posts.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-semibold">Articles</h2>
          <ul className="mt-4 divide-y">
            {posts.map((p) => (
              <li key={p.slug} className="py-4">
                <Link href={{ pathname: '/blog/[slug]', params: { slug: p.slug } }} className="font-medium hover:text-primary">
                  {p.title}
                </Link>
                <p className="text-body-sm text-muted-foreground">{formatDate(p.updated, locale)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
