import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Clock } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { locales, type Locale } from '@/i18n/routing';
import { localeAlternatesFromSlugs, absoluteUrl } from '@/lib/seo';
import { getGuideBySlug, getAllGuideSlugs, getGuides } from '@/lib/queries/guides';
import { getDestinations } from '@/lib/queries/taxonomy';
import { QuoteStarter } from '@/components/home/quote-starter';
import { formatDate } from '@/lib/format';
import { createPublicClient } from '@/lib/supabase/public';
import { PublicGallery } from '@/components/media/public-gallery';
import { GuideCard } from '@/components/cards/guide-card';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { EndBand } from '@/components/home/sections';
import { AdSlot } from '@/components/ads/ad-slot';
import { PageView } from '@/components/analytics/page-view';

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
    // Guide slugs are translated ("tanzania-safari-cost" vs
    // "tansania-safari-kosten"), so alternates come from the real per-locale
    // slugs. Reusing one slug across locales advertises URLs that 404.
    alternates: localeAlternatesFromSlugs('/guides/[slug]', guide.allSlugs, locale),
    openGraph: {
      type: 'article',
      title: guide.title,
      description: guide.excerpt ?? undefined,
      publishedTime: guide.publishedAt ?? undefined,
    },
  };
}

/**
 * Split an article's Markdown after its second H2 — design.md §7.12.
 *
 * "Inline QuoteStarter mini-card after the 2nd H2."
 *
 * Two sections in is where a reader has decided the article is worth their
 * time and has not yet finished it, which is the one moment a conversion card
 * is useful rather than an interruption. Earlier reads as an ad before the
 * content; at the foot it competes with the end band that is already there.
 *
 * Splitting the source rather than post-processing the rendered tree, because
 * `react-markdown` gives back React elements and slicing those means guessing
 * at the shape of its output. A `## ` at the start of a line is unambiguous in
 * the Markdown these guides are written in.
 */
function splitAfterSecondH2(body: string): [string, string] {
  const lines = body.split('\n');
  let seen = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      seen += 1;
      // The third H2 is where the second section ends.
      if (seen === 3) {
        return [lines.slice(0, i).join('\n'), lines.slice(i).join('\n')];
      }
    }
  }
  return [body, ''];
}

/** The H2s, for the "On this page" list §7.12 asks for at four or more. */
function headings(body: string): { text: string; id: string }[] {
  return body
    .split('\n')
    .filter((l) => /^##\s/.test(l))
    .map((l) => {
      const text = l.replace(/^##\s+/, '').replace(/\s*#*\s*$/, '').trim();
      return {
        text,
        id: text
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s-]/gu, '')
          .trim()
          .replace(/\s+/g, '-'),
      };
    });
}

export default async function GuidePage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const guide = await getGuideBySlug(slug, locale);
  if (!guide) notFound();

  // Public client so this stays statically generated — guides are the SEO
  // surface and the cookie-bound client would make every one of them dynamic.
  const publicDb = createPublicClient();

  const [related, gallery, destinations, tCard, tNav, tCommon, tGuide] = await Promise.all([
    getGuides(locale, { limit: 4 }),
    publicDb
      .from('media')
      .select('id, public_url, caption, alt_text')
      .eq('guide_id', guide.id)
      .eq('kind', 'gallery')
      .order('sort_order'),
    getDestinations(locale, { limit: 48 }),
    getTranslations('card'),
    getTranslations('nav'),
    getTranslations('common'),
    getTranslations('guideArticle'),
  ]);

  const others = related.filter((g) => g.id !== guide.id).slice(0, 3);

  // §7.12: the article splits after its second H2 for the inline quote card,
  // and grows a table of contents at four headings or more.
  const [bodyBefore, bodyAfter] = guide.body ? splitAfterSecondH2(guide.body) : ['', ''];
  const toc = guide.body ? headings(guide.body) : [];

  // Every country's destinations; the field is searchable.
  const quoteDestinations = destinations
    .map((d) => ({ value: d.slug, label: d.name }));

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
        <PageView locale={locale} guideId={guide.id} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <article>
          {/* §5.1.5: "a real licensed photo with credit, or no hero at all
              (title block on --surface-muted)". No fallback tile here — above an
              article it is a 24rem frame around nothing, and with almost no
              licensed photography across the 21 published guides it was the first
              thing every reader saw. The title block below carries the page. */}
          {guide.coverImageUrl && (
            <div className="relative aspect-[21/9] max-h-[24rem] w-full overflow-hidden bg-surface-sunken">
              <Image
                src={guide.coverImageUrl}
                alt=""
                fill
                priority
                fetchPriority="high"
                sizes="100vw"
                quality={70}
                className="object-cover"
              />
            </div>
          )}

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
                Guides are the only route where ads are permitted, and this is the
                right position: between the header and the body, where a reader is
                in research mode rather than mid-decision. AdSlot renders nothing
                unless ads are switched on, this surface has an ad unit, and the
                guide allows ads.
              */}
              <AdSlot surface="guide-body" allowAds={guide.allowAds} />

              {/* §7.12: "Table of contents ... when >= 4 H2s." Collapsible,
                  because on a phone a ten-item list between the lead and the
                  first paragraph is a wall before the article starts. */}
              {toc.length >= 4 && (
                <details className="mt-8 rounded-lg border bg-surface-muted p-4" open>
                  <summary className="cursor-pointer text-label font-semibold">
                    {tGuide('onThisPage')}
                  </summary>
                  <ol className="mt-3 space-y-1.5">
                    {toc.map((h) => (
                      <li key={h.id}>
                        <a
                          href={`#${h.id}`}
                          className="text-body-sm text-primary underline-offset-4 hover:underline"
                        >
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </details>
              )}

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
                    {bodyBefore}
                  </Markdown>

                  {/* §7.12 / §7.0: the guides template's primary action is an
                      inline "Get free quotes" after the second H2. Not the full
                      hero form — one destination field and a button, because an
                      article is not a place to fill in five fields. */}
                  {bodyAfter && (
                    <aside className="not-prose my-10 rounded-lg border bg-surface-muted p-4">
                      <p className="mb-3 text-heading-sm font-semibold">{tGuide('inlineCta')}</p>
                      <QuoteStarter destinations={quoteDestinations} variant="inline" />
                    </aside>
                  )}

                  {bodyAfter && (
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
                      {bodyAfter}
                    </Markdown>
                  )}
                </div>
              )}
            </div>
          </div>
        </article>

        {/* Below the article rather than inside it: the prose column is narrow for
            readability, and a full-width gallery inside it would either be cramped
            or break the measure the whole page is set to. */}
        {(gallery.data?.length ?? 0) > 0 && (
          <Section title={tCommon('photos')}>
            <PublicGallery images={gallery.data ?? []} />
          </Section>
        )}

        {others.length > 0 && (
          <Section title={tNav('guides')} muted>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((g) => (
                <GuideCard key={g.id} guide={g} />
              ))}
            </div>
          </Section>
        )}

        <EndBand />
      </>
  );
}
