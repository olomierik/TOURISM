import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Map, TriangleAlert } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { DeleteTripButton } from '@/components/trip/delete-trip';

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'savedTrips' });
  return { title: t('pageTitle'), robots: { index: false, follow: false } };
}

/**
 * Trips a traveller has kept.
 *
 * Each one reopens in the estimator rather than rendering its own read-only
 * view, because a saved trip is something you are still deciding about — the
 * useful action is "make it eight nights instead of six", not "look at what I
 * chose in March". The estimator already takes a whole trip in its query
 * string, so the link is the trip.
 *
 * A trip whose destination has since been withdrawn is reported, not silently
 * shortened. saved_trips.stop_count remembers what was saved; if fewer stops
 * come back than that, the difference is stated rather than papered over — a
 * plan that quietly loses a stop is worse than one that says it has.
 */
export default async function SavedTripsPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already gates /account; this narrows the type and is defence in
  // depth rather than the primary check.
  if (!user) redirect('/login');

  const t = await getTranslations('savedTrips');
  const tCost = await getTranslations('tripCost');

  // RLS restricts these to the caller's own rows, so no profile filter is
  // repeated here.
  const { data: trips } = await supabase
    .from('saved_trips')
    .select(
      `id, name, style, travellers, stop_count, created_at,
       saved_trip_stops (nights, position,
         destinations (is_active, deleted_at,
           destination_translations (locale, name, slug)))`,
    )
    .order('created_at', { ascending: false });

  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });

  const rows = (trips ?? []).map((trip) => {
    const stops = [...(trip.saved_trip_stops ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((s) => {
        const d = s.destinations as unknown as {
          is_active: boolean;
          deleted_at: string | null;
          destination_translations: Array<{ locale: string; name: string; slug: string }>;
        } | null;
        if (!d || !d.is_active || d.deleted_at) return null;

        const all = d.destination_translations ?? [];
        const tr = all.find((x) => x.locale === locale) ?? all.find((x) => x.locale === 'en');
        return tr ? { name: tr.name, slug: tr.slug, nights: s.nights } : null;
      })
      .filter((s): s is { name: string; slug: string; nights: number } => s !== null);

    return {
      id: trip.id,
      name: trip.name,
      style: trip.style,
      travellers: trip.travellers,
      createdAt: trip.created_at,
      stops,
      // The stops that no longer resolve. Named as a count because naming the
      // place would mean reading a row that is gone.
      lost: Math.max(0, trip.stop_count - stops.length),
      nights: stops.reduce((sum, s) => sum + s.nights, 0),
    };
  });

  const STYLES = ['budget', 'midrange', 'luxury'] as const;
  type Style = (typeof STYLES)[number];
  const styleLabel = (s: string) =>
    STYLES.includes(s as Style) ? tCost(`style.${s as Style}`) : s;

  return (
    <div className="container-page max-w-3xl py-section">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">{t('pageTitle')}</h1>
        <p className="mt-3 text-muted-foreground">{t('pageSubtitle')}</p>
      </div>

      {rows.length === 0 ? (
        <div className="flex min-h-[40svh] flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary">
            <Map className="size-7 text-muted-foreground" aria-hidden />
          </div>
          <h2 className="mt-6 text-xl font-semibold">{t('empty')}</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t('emptyBody')}
          </p>
          <Button asChild className="mt-6">
            <Link href="/trip-cost">{t('emptyCta')}</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((trip) => (
            <li key={trip.id} className="rounded-xl border p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-display text-lg font-semibold">
                  {trip.name ?? t('untitled', { date: dateFmt.format(new Date(trip.createdAt)) })}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {t('summary', {
                    nights: trip.nights,
                    travellers: trip.travellers,
                    style: styleLabel(trip.style),
                  })}
                </span>
              </div>

              {trip.stops.length > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {trip.stops
                    .map((s) => `${s.name} · ${tCost('nights', { count: s.nights })}`)
                    .join('  →  ')}
                </p>
              )}

              {trip.lost > 0 && (
                <p className="mt-3 flex gap-2 rounded-lg border border-dashed p-3 text-xs leading-relaxed">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{t('lostStops', { count: trip.lost })}</span>
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {trip.stops.length > 0 && (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={{
                        pathname: '/trip-cost',
                        query: {
                          stops: trip.stops.map((s) => `${s.slug}:${s.nights}`).join(','),
                          style: trip.style,
                          people: String(trip.travellers),
                        },
                      }}
                    >
                      {t('open')}
                    </Link>
                  </Button>
                )}
                <DeleteTripButton tripId={trip.id} label={t('delete')} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
