import { getTranslations } from 'next-intl/server';
import { ArrowRight, Scale } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getAlternativesTo } from '@/lib/queries/taxonomy';

/**
 * "You are reading about the Serengeti. Here are two places that are not it."
 *
 * This is the half of the hidden-gems feature that does the work. A hub page at
 * /hidden-gems is a page somebody has to find; this block is on the page they
 * are already on, at the moment they are deciding, and for several destinations
 * it is the only internal link pointing at them anywhere on the site — Mahale
 * had eighty operators attached and nothing linking to it.
 *
 * The trade-off is shown, not hidden behind the pitch. Sending a reader to
 * Kidepo without telling them it is a day's drive from Kampala converts once
 * and never again.
 *
 * Renders nothing where a destination has no alternatives written for it, which
 * is most of them — this is a block for the famous eleven.
 */
export async function QuieterAlternatives({
  destinationId,
  destinationName,
  locale,
}: {
  destinationId: string;
  destinationName: string;
  locale: Locale;
}) {
  const [gems, t] = await Promise.all([
    getAlternativesTo(destinationId, locale),
    getTranslations({ locale, namespace: 'hiddenGems' }),
  ]);

  if (gems.length === 0) return null;

  return (
    <section className="container-page py-section">
      <h2 className="font-display text-2xl font-semibold sm:text-3xl">
        {t('alternativesTitle', { name: destinationName })}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {t('alternativesIntro', { name: destinationName })}
      </p>

      <ul className="mt-7 grid gap-5 lg:grid-cols-2">
        {gems.map((g) => (
          <li key={g.id} className="flex flex-col rounded-xl border p-5">
            <h3 className="font-display text-lg font-semibold">
              <Link
                href={{ pathname: '/destinations/[slug]', params: { slug: g.destination.slug } }}
                className="hover:text-primary"
              >
                {g.destination.name}
              </Link>
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.pitch}</p>

            <p className="mt-3 flex gap-2 rounded-lg bg-secondary/40 p-3 text-sm leading-relaxed">
              <Scale className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="font-medium">{t('tradeOffLabel')}</span> {g.tradeOff}
              </span>
            </p>

            <Link
              href={{ pathname: '/destinations/[slug]', params: { slug: g.destination.slug } }}
              className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-medium text-primary hover:underline"
            >
              {t('readMore', { name: g.destination.name })}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
