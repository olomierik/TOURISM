import { getTranslations } from 'next-intl/server';
import { MapPin } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { createPublicClient } from '@/lib/supabase/public';

/**
 * Destinations across Africa, grouped by country.
 *
 * Renders nothing when only one country has destinations. Until there is
 * something beyond Tanzania to show, a section headed "Explore Africa" listing
 * eight Tanzanian places is a promise the site does not keep — and the homepage
 * already has a Tanzanian destination grid directly above it.
 *
 * The whole section is one query joined to countries, ordered by the curation
 * order, so Tanzania stays first as coverage grows.
 */
export async function ExploreAfrica({ locale }: { locale: Locale }) {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('destinations')
    .select(
      `id, country_code, sort_order,
       countries!inner (code, name, sort_order),
       destination_translations!inner (locale, name, slug)`,
    )
    .eq('destination_translations.locale', locale)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order');

  if (error || !data?.length) return null;

  // Group by country, preserving the curation order the query already applied.
  const byCountry = new Map<string, { name: string; sort: number; places: { slug: string; name: string }[] }>();

  for (const d of data) {
    const country = d.countries as unknown as { code: string; name: string; sort_order: number };
    const tr = (d.destination_translations as unknown as { name: string; slug: string }[])[0];
    if (!country || !tr) continue;

    const entry = byCountry.get(country.code) ?? {
      name: country.name,
      sort: country.sort_order,
      places: [],
    };
    entry.places.push({ slug: tr.slug, name: tr.name });
    byCountry.set(country.code, entry);
  }

  // One country is not a continent.
  if (byCountry.size < 2) return null;

  const countries = [...byCountry.values()].sort((a, b) => a.sort - b.sort);
  const t = await getTranslations('home.africa');

  return (
    <section className="border-t bg-secondary/30 py-section">
      <div className="container-page">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">{t('title')}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {countries.map((c) => (
            <div key={c.name}>
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
                {c.name}
              </h3>
              <ul className="mt-3 space-y-1.5">
                {c.places.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={{ pathname: '/destinations/[slug]', params: { slug: p.slug } }}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
