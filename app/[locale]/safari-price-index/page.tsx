import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { englishAlternates, requireEnglish } from '@/lib/blog/english-only';
import { absoluteUrl } from '@/lib/seo';
import { getPriceIndex, indexVisible, MIN_QUOTES, MIN_SAMPLE, PUBLISHED } from '@/lib/price-index';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Badge } from '@/components/ui/badge';

export const revalidate = 86400;

const TITLE = 'Tanzania Safari Price Index';

export function generateMetadata(): Metadata {
  return {
    title: TITLE,
    description:
      'What a safari day costs in each Tanzanian park: operator tour prices, day rates and cost bands, with the sample behind every number.',
    alternates: englishAlternates('/safari-price-index'),
    ...(PUBLISHED ? {} : { robots: { index: false, follow: false } }),
  };
}

const usd = (n: number) => `$${n.toLocaleString('en-US')}`;
const range = (r: [number, number] | null) => (r ? `${usd(r[0])}–${usd(r[1])}` : '—');

/** SEO brief T11. Draft until approved: see lib/price-index.ts. */
export default async function PriceIndexPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  requireEnglish(locale, '/safari-price-index');
  setRequestLocale(locale);
  if (!indexVisible) notFound();

  const { rows, asOf, totals } = await getPriceIndex();
  const max = Math.max(...rows.map((r) => r.estimate.midrange?.[1] ?? 0), 1);
  const embedUrl = absoluteUrl('/embed/safari-price-index.html');

  return (
    <div className="container-page py-section">
      <Breadcrumbs locale={locale} items={[{ label: 'Explore Tanzania', href: '/' }, { label: TITLE }]} />

      <header className="mt-6 max-w-3xl">
        {!PUBLISHED && (
          <p className="mb-4 rounded-lg border border-[var(--warning-800)]/30 bg-[var(--warning-50)] p-3 text-body-sm text-[var(--warning-800)]">
            <Badge variant="demo" className="me-2">Draft</Badge>
            Visible on previews only, until approved.
          </p>
        )}
        <h1 className="text-4xl font-semibold sm:text-5xl">{TITLE}</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          What one day on safari costs per person in each Tanzanian park, from the prices operators publish on
          ExploreTanzania.online and the cost bands on our park pages. Every median shows how many prices it
          rests on. Updated {asOf}.
        </p>
      </header>

      <section className="mt-10" aria-labelledby="chart">
        <h2 id="chart" className="text-2xl font-semibold">Mid-range cost per person per day</h2>
        <ul className="mt-5 max-w-3xl space-y-3">
          {rows.map((r) =>
            r.estimate.midrange ? (
              <li key={r.slug} className="grid grid-cols-[minmax(8rem,12rem)_1fr] items-center gap-3">
                <Link href={{ pathname: '/destinations/[slug]', params: { slug: r.slug } }} className="truncate text-body-sm hover:text-primary">
                  {r.park}
                </Link>
                <div className="relative h-7 rounded bg-surface-muted">
                  <div
                    className="absolute inset-y-0 rounded bg-primary/25"
                    style={{
                      left: `${(r.estimate.midrange[0] / max) * 100}%`,
                      width: `${((r.estimate.midrange[1] - r.estimate.midrange[0]) / max) * 100}%`,
                    }}
                  />
                  <span className="absolute inset-y-0 end-2 flex items-center text-caption tabular-nums text-muted-foreground">
                    {range(r.estimate.midrange)}
                  </span>
                </div>
              </li>
            ) : null,
          )}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="table">
        <h2 id="table" className="text-2xl font-semibold">By park</h2>
        <div className="mt-5 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[48rem] text-left text-body-sm [&_td]:border-t [&_td]:px-3 [&_td]:py-2 [&_th]:bg-surface-muted [&_th]:px-3 [&_th]:py-2">
            <thead>
              <tr>
                <th>Park</th>
                <th>Tours on this site (median / day)</th>
                <th>Operator day rates (median)</th>
                <th>Budget</th>
                <th>Mid-range</th>
                <th>Luxury</th>
                <th>Park fees in that</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => (
                <tr key={r.slug}>
                  <td className="font-medium">{r.park}</td>
                  <td>
                    {r.tours.median != null ? usd(r.tours.median) : <span className="text-muted-foreground">not enough data</span>}{' '}
                    <span className="text-muted-foreground">(n={r.tours.n})</span>
                  </td>
                  <td>
                    {r.dayRates.median != null ? usd(r.dayRates.median) : <span className="text-muted-foreground">not enough data</span>}{' '}
                    <span className="text-muted-foreground">(n={r.dayRates.n})</span>
                  </td>
                  <td>{range(r.estimate.budget)}</td>
                  <td>{range(r.estimate.midrange)}</td>
                  <td>{range(r.estimate.luxury)}</td>
                  <td>{range(r.estimate.parkFees)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex flex-wrap gap-4 text-body-sm">
          <a href="/safari-price-index.csv" className="font-medium text-primary hover:underline">
            Download as CSV
          </a>
        </p>
      </section>

      <section className="mt-12 max-w-3xl" aria-labelledby="method">
        <h2 id="method" className="text-2xl font-semibold">How it is built</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
          <li>
            <strong className="text-foreground">Tours:</strong> per-person tour prices published by operators on
            this site, divided by the tour&rsquo;s days, at the price shown to travellers. {totals.tours} tours in
            all; a tour counts towards every park it visits.
          </li>
          <li>
            <strong className="text-foreground">Day rates:</strong> the lowest day rate each operator publishes,
            counted for every park they serve. {totals.operators} operators publish one.
          </li>
          <li>
            <strong className="text-foreground">Budget, mid-range and luxury</strong> are the researched cost bands
            on each park page, including park fees; they are estimates, not observed prices.
          </li>
          <li>A median needs at least {MIN_SAMPLE} prices; below that the cell says so.</li>
          <li>
            Traveller budgets from quote requests will be added once a park has at least {MIN_QUOTES}; until then
            they are too few to be a fair median, and too few to keep anonymous.
          </li>
          <li>There is no split by season yet: none of these prices is dated by travel month.</li>
        </ul>
      </section>

      <section className="mt-12 max-w-3xl" aria-labelledby="embed">
        <h2 id="embed" className="text-2xl font-semibold">Use this chart</h2>
        <p className="mt-3 text-muted-foreground">
          You may republish the chart or the CSV with a link back to this page. To embed the chart:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border bg-surface-muted p-4 text-caption">
          {`<iframe src="${embedUrl}" title="${TITLE}" width="100%" height="480" style="border:0"></iframe>\n<p><a href="${absoluteUrl('/safari-price-index')}">${TITLE}</a> by ExploreTanzania.online</p>`}
        </pre>
      </section>
    </div>
  );
}
