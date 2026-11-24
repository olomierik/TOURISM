import { getFormatter, getTranslations } from 'next-intl/server';
import { BadgeCheck, CalendarDays, Users } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { formatMoney } from '@/lib/leads/quote-types';
import type { Departure } from '@/lib/group-trips/departures';
import { cn } from '@/lib/utils';

/** An open group trip, as somebody looking for a group to join compares them. */
export async function DepartureCard({ departure: d, locale }: { departure: Departure; locale: string }) {
  const [t, tG, format] = await Promise.all([getTranslations('groupTrips.join'), getTranslations('tourGuides'), getFormatter()]);
  const date = (iso: string) => format.dateTime(new Date(`${iso}T12:00:00Z`), { day: 'numeric', month: 'short' });
  const low = d.seatsLeft > 0 && d.seatsLeft <= 4;
  return (
    <Link
      href={{ pathname: '/group-trips/[slug]', params: { slug: d.slug } }}
      className="press flex h-full flex-col rounded-2xl border bg-card p-4 transition-colors hover:border-primary"
    >
      <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-primary">
        <CalendarDays className="size-3.5" aria-hidden />
        {date(d.startDate)} – {date(d.endDate)} · {t('days', { count: d.days })}
      </p>
      <h3 className="mt-1 font-semibold leading-snug">{d.title}</h3>
      {d.region && <p className="text-body-sm text-muted-foreground">{d.region}</p>}
      <p className="mt-1 flex items-center gap-1 text-body-sm text-muted-foreground">
        {d.guide.verified && <BadgeCheck className="size-3.5 text-success" aria-hidden />}
        {d.guide.name}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {d.audiences.map((a) => (
          <span key={a} className="rounded-full bg-muted px-2 py-0.5 text-caption">
            {tG(`audience.${a as 'church'}`)}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <span>
          <span className="text-lg font-bold tabular-nums">{formatMoney(d.pricePerPerson, d.currency, locale)}</span>
          <span className="text-caption text-muted-foreground"> {t('perPerson')}</span>
        </span>
        <span className={cn('flex items-center gap-1 text-body-sm', d.seatsLeft === 0 ? 'text-destructive' : low ? 'font-semibold text-primary' : 'text-muted-foreground')}>
          <Users className="size-3.5" aria-hidden />
          {d.seatsLeft === 0 ? t('full') : t('seatsLeft', { count: d.seatsLeft })}
        </span>
      </div>
    </Link>
  );
}
