import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { ExternalLink, Users } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { myTourGuide } from '@/lib/tour-guides/queries';
import { myDepartures } from '@/lib/group-trips/departures';
import { formatMoney } from '@/lib/leads/quote-types';
import { Button } from '@/components/ui/button';
import { DepartureForm } from '@/components/group-trips/departure-form';

/**
 * A guide's open group trips: publish new ones, edit, close. Travellers who
 * join arrive as ordinary enquiries with the trip's quote already attached.
 */
export default async function DashboardDeparturesPage({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams>;
  searchParams: Promise<{ edit?: string; new?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { edit, new: isNew } = await searchParams;
  const [t, format, guide] = await Promise.all([getTranslations('groupTrips.manage'), getFormatter(), myTourGuide()]);

  if (!guide) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-body-sm">
        <p>{t('notGuide')}</p>
        <Button asChild className="mt-3">
          <Link href="/tour-guides/join">{t('becomeGuide')}</Link>
        </Button>
      </div>
    );
  }
  const departures = await myDepartures(guide.businessId);
  const editing = edit ? departures.find((d) => d.id === edit) : undefined;
  const date = (iso: string) => format.dateTime(new Date(`${iso}T12:00:00Z`), { dateStyle: 'medium' });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('pageTitle')}</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">{t('pageLead')}</p>
        </div>
        {!isNew && !editing && (
          <Button asChild>
            <Link href={{ pathname: '/dashboard/departures', query: { new: '1' } }}>{t('new')}</Link>
          </Button>
        )}
      </div>
      {guide.verificationStatus !== 'verified' && <p className="rounded-xl bg-muted p-3 text-body-sm">{t('notVerifiedYet')}</p>}
      {(isNew || editing) && <DepartureForm departure={editing} />}
      <div className="space-y-3">
        {departures.length === 0 && !isNew && <p className="rounded-2xl border border-dashed p-6 text-center text-body-sm text-muted-foreground">{t('empty')}</p>}
        {departures.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
            <div>
              <p className="font-semibold">{d.title}</p>
              <p className="text-body-sm text-muted-foreground">
                {date(d.startDate)} – {date(d.endDate)} · {formatMoney(d.pricePerPerson, d.currency, locale)} · {t(`status${d.status[0].toUpperCase()}${d.status.slice(1)}` as 'statusOpen')}
              </p>
              <p className="mt-1 flex items-center gap-1 text-body-sm">
                <Users className="size-4" aria-hidden />
                {t('booked', { taken: d.seatsTaken, total: d.seatsTotal })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={{ pathname: '/dashboard/departures', query: { edit: d.id } }}>{t('edit')}</Link>
              </Button>
              {d.seatsTaken > 0 && (
                <Button asChild size="sm" variant="outline">
                  <Link href={{ pathname: '/group-trips/[slug]/chat', params: { slug: d.slug } }}>{t('chat')}</Link>
                </Button>
              )}
              {d.status === 'open' && (
                <Button asChild size="sm" variant="ghost">
                  <Link href={{ pathname: '/group-trips/[slug]', params: { slug: d.slug } }}>
                    <ExternalLink className="size-3.5" aria-hidden />
                    {t('view')}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
