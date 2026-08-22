import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Clock } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { locales, type Locale } from '@/i18n/routing';
import { localeAlternates, absoluteUrl } from '@/lib/seo';
import { getGuideBySlug, getAllGuideSlugs, getGuides } from '@/lib/queries/guides';
import { formatDate } from '@/lib/format';
import { MediaPlaceholder } from '@/components/cards/media-placeholder';
import { GuideCard } from '@/components/cards/guide-card';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { QuoteCta } from '@/components/home/quote-cta';

type Params = { locale: Locale; slug: string };

export async function generateStaticParams() {
  // Guide slugs differ per locale, so each locale is enumerated separately —
  // unlike businesses and packages, whose slugs are shared.
  const params: Array<{ locale: string; slug: string }> = [];
  for (const locale of locales) {
    const slugs = await getAllGuideSlugs(locale);
    for (const slug of slugs) params.push({ locale, slug });
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = await getGuideBySlug(slug, locale);
  if (!guide) return {};

  return {
    title: guide.seoTitle ?? guide.title,
    description: guide.seoDescription ?? guide.excerpt ?? undefined,
    alternates: localeAlternates({ pathname: '/guides/[slug]', params: { slug } }, locale),
    openGraph: {
      type: 'article',
      title: guide.title,
      description: guide.excerpt ?? undefined,
      publishedTime: guide.publishedAt ?? undefined,
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const guide = await getGuideBySlug(slug, locale);
  if (!guide) notFound();

  const [related, tCard, tNav, tCommon] = await Promise.all([
    getGuides(locale, { limit: 4 }),
    getTranslations('card'),
    getTranslations('nav'),
    getTranslations('common'),
  ]);

  const others = related.filter((g) => g.id !== guide.id).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.excerpt ?? undefined,
    url: absoluteUrl(`/guides/${slug}`),
    ...(guide.publishedAt ? { datePublished: guide.publishedAt } : {}),
    publisher: { '@type': 'Organization', name: 'Explore Tanzania' },
    inLanguage: locale,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article>
        <div className="relative aspect-[21/9] max-h-[24rem] w-full overflow-hidden">
          {guide.coverImageUrl ? (
            <Image src={guide.coverImageUrl} alt="" fill priority sizes="100vw" className="object-cover" />
          ) : (
            <MediaPlaceholder seed={guide.slug} className="absolute inset-0" />
          )}
        </div>

        <div className="container-page pt-8">
          <Breadcrumbs
            locale={locale}
            items={[
              { label: 'Explore Tanzania', href: '/' },
              { label: tNav('guides'), href: '/guides' },
              { label: guide.title },
            ]}
          />
        </div>

        <div className="container-page py-section">
          {/* Editorial measure: ~68 characters. Wider than this and long-form
              prose becomes noticeably harder to track line to line. */}
          <div className="mx-auto max-w-[42rem]">
            <header>
              {guide.isDemo && (
                <Badge variant="demo" className="mb-4">
                  {tCommon('demoData')}
                </Badge>
              )}
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                {guide.title}
              </h1>
              {guide.excerpt && (
                <p className="mt-5 text-xl leading-relaxed text-muted-foreground">
                  {guide.excerpt}
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-6 text-sm text-muted-foreground">
                {guide.readingMinutes && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" aria-hidden />
                    {tCard('readingMinutes', { minutes: guide.readingMinutes })}
                  </span>
                )}
                {guide.publishedAt && <time>{formatDate(guide.publishedAt, locale)}</time>}
              </div>
            </header>

            {/*
              Guides are the only route where ads are ever permitted, and the
              slot belongs here — between the header and the body, where a
              reader is in research mode rather than mid-decision. The AdSlot
              component itself arrives in Phase 8; guide.allowAds already gates it.
            */}

            {guide.body && (
              <div
                className="mt-10 space-y-6 leading-relaxed
                  [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-semibold
                  [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold
                  [&_p]:text-lg [&_p]:text-muted-foreground
                  [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:text-muted-foreground
                  [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:text-muted-foreground
                  [&_li]:text-lg
                  [&_strong]:font-semibold [&_strong]:text-foreground
                  [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4
                  [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-5 [&_blockquote]:italic
                  [&_table]:w-full [&_table]:text-left [&_table]:text-base
                  [&_th]:border-b [&_th]:py-2.5 [&_th]:font-medium
                  [&_td]:border-b [&_td]:py-2.5 [&_td]:text-muted-foreground"
              >
                {/* Tables wrap in their own scroll container so a wide price
                    comparison cannot force the whole page to scroll sideways. */}
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ children }) => (
                      <div className="overflow-x-auto">
                        <table>{children}</table>
                      </div>
                    ),
                  }}
                >
                  {guide.body}
                </Markdown>
              </div>
            )}
          </div>
        </div>
      </article>

      {others.length > 0 && (
        <Section title={tNav('guides')} muted>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </div>
        </Section>
      )}

      <QuoteCta />
    </>
  );
}
