'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';

import { estimateGroupTrip, type Region, type StayKind } from '@/lib/group-trips/costs';
import { cn } from '@/lib/utils';

const REGIONS: Region[] = ['arusha', 'moshi', 'usambara', 'zanzibar', 'dar'];
const STAYS: StayKind[] = ['hostel', 'homestay', 'guesthouse'];

/**
 * "The bigger the group, the cheaper each person travels", shown rather than
 * claimed: move the group size and the price per person drops, because the
 * guide's day is shared. Estimates, labelled as such; the guide's quote is the
 * price. Writes its choices into the request form below through hidden
 * fields (by id), so asking for this trip is one press.
 */
export function GroupCostCalculator() {
  const t = useTranslations('groupTrips.calc');
  const [people, setPeople] = useState(12);
  const [days, setDays] = useState(5);
  const [region, setRegion] = useState<Region>('arusha');
  const [stay, setStay] = useState<StayKind>('hostel');
  const e = useMemo(() => estimateGroupTrip({ people, days, stay, region }), [people, days, stay, region]);
  const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

  const carry = () => {
    const set = (id: string, v: string) => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
      if (el) {
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };
    set('gr-adults', String(people));
    set('gr-days', String(days));
    set('gr-stay', stay);
    set('gr-budget', String(e.perPersonPerDay[1]));
    set('gr-region', t(`region.${region}`));
    document.getElementById('request')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const chip = (on: boolean) =>
    cn('rounded-full border px-3 py-1.5 text-body-sm transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:border-primary');

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-[var(--elev-xs)] sm:p-6">
      <h2 className="font-display text-xl font-semibold">{t('title')}</h2>
      <p className="mt-1 text-body-sm text-muted-foreground">{t('lead')}</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-5">
          <div>
            <label htmlFor="calc-people" className="flex items-center justify-between text-body-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <Users className="size-4" aria-hidden />
                {t('people')}
              </span>
              <span className="tabular-nums">{people}</span>
            </label>
            <input
              id="calc-people"
              type="range"
              min={2}
              max={60}
              value={people}
              onChange={(ev) => setPeople(Number(ev.target.value))}
              className="mt-2 w-full accent-[var(--primary)]"
            />
          </div>
          <div>
            <label htmlFor="calc-days" className="flex items-center justify-between text-body-sm font-semibold">
              {t('days')}
              <span className="tabular-nums">{days}</span>
            </label>
            <input
              id="calc-days"
              type="range"
              min={1}
              max={14}
              value={days}
              onChange={(ev) => setDays(Number(ev.target.value))}
              className="mt-2 w-full accent-[var(--primary)]"
            />
          </div>
          <div>
            <p className="text-body-sm font-semibold">{t('where')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <button key={r} type="button" aria-pressed={region === r} onClick={() => setRegion(r)} className={chip(region === r)}>
                  {t(`region.${r}`)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-body-sm font-semibold">{t('stay')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {STAYS.map((s) => (
                <button key={s} type="button" aria-pressed={stay === s} onClick={() => setStay(s)} className={chip(stay === s)}>
                  {t(`stayKind.${s}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-primary-subtle p-4" aria-live="polite">
          <p className="text-caption font-semibold uppercase tracking-wide text-primary">{t('perPersonDay')}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {usd(e.perPersonPerDay[0])}–{usd(e.perPersonPerDay[1])}
          </p>
          <p className="mt-1 text-body-sm">
            {t('perPersonTrip', { low: usd(e.perPersonTotal[0]), high: usd(e.perPersonTotal[1]), days })}
          </p>
          <dl className="mt-3 space-y-1 border-t border-primary/20 pt-3 text-body-sm">
            {e.lines.map((l) => (
              <div key={l.key} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">
                  {t(`line.${l.key}`, { guides: e.guides })}
                </dt>
                <dd className="tabular-nums">
                  {usd(l.perPersonPerDay[0])}–{usd(l.perPersonPerDay[1])}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-caption text-muted-foreground">{t('compare')}</p>
          <button
            type="button"
            onClick={carry}
            className="press mt-3 w-full rounded-full bg-primary px-4 py-2.5 text-body-sm font-semibold text-primary-foreground"
          >
            {t('askGuides')}
          </button>
        </div>
      </div>
      <p className="mt-3 text-caption text-muted-foreground">{t('disclaimer')}</p>
    </section>
  );
}
