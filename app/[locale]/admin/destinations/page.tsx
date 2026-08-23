import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MapPin, Plus } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default async function AdminDestinationsPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.destinationsPage');
  const supabase = await createClient();

  // Retired destinations are listed too, greyed out. An admin looking for one
  // they removed by mistake should find it here rather than concluding it is
  // gone for good and creating a duplicate.
  const { data: destinations } = await supabase
    .from('destinations')
    .select(
      `id, key, is_active, is_featured, is_demo, sort_order, deleted_at,
       destination_translations (locale, name, slug),
       business_destinations (business_id)`,
    )
    .order('sort_order');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button asChild>
          <Link href="/admin/destinations/new">
            <Plus className="size-4" aria-hidden />
            {t('create')}
          </Link>
        </Button>
      </div>

      <ul className="space-y-3">
        {(destinations ?? []).map((d) => {
          const tr =
            d.destination_translations.find((x) => x.locale === locale) ??
            d.destination_translations.find((x) => x.locale === 'en');
          const localeCount = d.destination_translations.length;

          return (
            <li
              key={d.id}
              className={`rounded-2xl border bg-card p-5 ${d.deleted_at ? 'opacity-60' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {d.deleted_at ? (
                      <Badge variant="outline">{t('retired')}</Badge>
                    ) : d.is_active ? (
                      <Badge variant="verified">{t('active')}</Badge>
                    ) : (
                      <Badge variant="secondary">{t('hidden')}</Badge>
                    )}
                    {d.is_featured && <Badge variant="secondary">{t('featured')}</Badge>}
                    {d.is_demo && <Badge variant="secondary">{t('demo')}</Badge>}
                  </div>

                  <h2 className="mt-2 flex items-center gap-2 font-display text-lg font-semibold">
                    <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    {tr?.name ?? d.key}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('meta', {
                      locales: localeCount,
                      businesses: d.business_destinations.length,
                    })}
                  </p>
                </div>

                <Button asChild variant="outline" size="sm">
                  <Link href={{ pathname: '/admin/destinations/[id]', params: { id: d.id } }}>
                    {t('edit')}
                  </Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {!destinations?.length && (
        <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          {t('empty')}
        </p>
      )}
    </div>
  );
}
