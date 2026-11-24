'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import { saveDeparture, type DepartureState } from '@/lib/group-trips/departure-actions';
import type { Departure } from '@/lib/group-trips/departures';
import { GROUP_AUDIENCES } from '@/lib/tour-guides/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

type Day = { from: string; to: string; plan: string; overnight: string; meals: string };

/** A guide's open group trip: dates, price per person, seats and the plan. */
export function DepartureForm({ departure }: { departure?: Departure }) {
  const t = useTranslations('groupTrips.manage');
  const tG = useTranslations('tourGuides');
  const [state, action, pending] = useActionState<DepartureState, FormData>(saveDeparture, {});
  const [days, setDays] = useState<Day[]>(
    departure?.itinerary.map((d) => ({ from: d.from ?? '', to: d.to ?? '', plan: d.plan ?? '', overnight: d.overnight ?? '', meals: d.meals ?? '' })) ?? [],
  );
  const set = (i: number, p: Partial<Day>) => setDays((all) => all.map((d, j) => (j === i ? { ...d, ...p } : d)));

  return (
    <form action={action} className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
      {departure && <input type="hidden" name="id" value={departure.id} />}
      <input type="hidden" name="itinerary" value={JSON.stringify(days)} />
      <div className="space-y-1.5">
        <Label htmlFor="d-title">{t('title')}</Label>
        <Input id="d-title" name="title" required maxLength={140} defaultValue={departure?.title} placeholder={t('titlePlaceholder')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="d-summary">{t('summary')}</Label>
        <Textarea id="d-summary" name="summary" rows={2} maxLength={600} defaultValue={departure?.summary ?? ''} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="d-region">{t('region')}</Label>
          <Input id="d-region" name="region" maxLength={120} defaultValue={departure?.region ?? ''} placeholder="Arusha · Mto wa Mbu" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-stay">{t('stay')}</Label>
          <Input id="d-stay" name="stay" maxLength={40} defaultValue={departure?.stay ?? ''} placeholder={t('stayPlaceholder')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-start">{t('start')}</Label>
          <Input id="d-start" name="startDate" type="date" required defaultValue={departure?.startDate} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-end">{t('end')}</Label>
          <Input id="d-end" name="endDate" type="date" required defaultValue={departure?.endDate} />
        </div>
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="d-price">{t('price')}</Label>
            <Input id="d-price" name="price" type="number" min={1} required inputMode="numeric" defaultValue={departure?.pricePerPerson} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-cur">{tG('form.currency')}</Label>
            <Select id="d-cur" name="currency" defaultValue={departure?.currency ?? 'USD'}>
              <option value="USD">USD</option>
              <option value="TZS">TZS</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="d-seats">{t('seats')}</Label>
            <Input id="d-seats" name="seats" type="number" min={2} max={200} required inputMode="numeric" defaultValue={departure?.seatsTotal ?? 12} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-min">{t('minGroup')}</Label>
            <Input id="d-min" name="minGroup" type="number" min={1} max={200} inputMode="numeric" defaultValue={departure?.minGroup ?? ''} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-arr">{t('meet')}</Label>
          <Input id="d-arr" name="arrivalPoint" maxLength={200} defaultValue={departure?.arrivalPoint ?? ''} placeholder="Arusha clock tower, 8:00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-dep">{t('endPoint')}</Label>
          <Input id="d-dep" name="departurePoint" maxLength={200} defaultValue={departure?.departurePoint ?? ''} />
        </div>
      </div>
      <fieldset>
        <legend className="text-body-sm font-semibold">{t('audiences')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {GROUP_AUDIENCES.map((a) => (
            <label key={a} className="cursor-pointer">
              <input type="checkbox" name="audiences" value={a} defaultChecked={departure ? departure.audiences.includes(a) : true} className="peer sr-only" />
              <span className="inline-block rounded-full border px-3 py-1.5 text-body-sm peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
                {tG(`audience.${a}`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="d-inc">{t('includes')}</Label>
          <Textarea id="d-inc" name="includes" rows={3} defaultValue={departure?.includes ?? ''} placeholder={t('includesPlaceholder')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-exc">{t('excludes')}</Label>
          <Textarea id="d-exc" name="excludes" rows={3} defaultValue={departure?.excludes ?? ''} />
        </div>
      </div>

      <fieldset className="space-y-2 rounded-xl border p-3">
        <legend className="px-1 text-body-sm font-semibold">{t('plan')}</legend>
        {days.map((d, i) => (
          <div key={i} className="space-y-2 rounded-lg bg-muted/40 p-3">
            <div className="flex items-center justify-between">
              <p className="text-body-sm font-semibold">{t('dayN', { n: i + 1 })}</p>
              <button type="button" onClick={() => setDays((all) => all.filter((_, j) => j !== i))} className="flex items-center gap-1 text-caption text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" aria-hidden />
                {t('remove')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input aria-label={t('from')} placeholder={t('from')} value={d.from} onChange={(e) => set(i, { from: e.target.value })} />
              <Input aria-label={t('to')} placeholder={t('to')} value={d.to} onChange={(e) => set(i, { to: e.target.value })} />
            </div>
            <Textarea aria-label={t('dayPlan')} placeholder={t('dayPlan')} rows={2} value={d.plan} onChange={(e) => set(i, { plan: e.target.value })} />
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <Input aria-label={t('overnight')} placeholder={t('overnight')} value={d.overnight} onChange={(e) => set(i, { overnight: e.target.value })} />
              <Input aria-label={t('meals')} placeholder={t('meals')} value={d.meals} onChange={(e) => set(i, { meals: e.target.value })} />
            </div>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => setDays((all) => [...all, { from: all.at(-1)?.to ?? '', to: '', plan: '', overnight: '', meals: '' }])}>
          <Plus className="size-3.5" aria-hidden />
          {t('addDay')}
        </Button>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Select name="status" defaultValue={departure?.status ?? 'open'} aria-label={t('status')} className="w-auto">
          <option value="open">{t('statusOpen')}</option>
          <option value="draft">{t('statusDraft')}</option>
          <option value="closed">{t('statusClosed')}</option>
          <option value="cancelled">{t('statusCancelled')}</option>
        </Select>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {departure ? t('save') : t('publish')}
        </Button>
        {state.success && <span className="text-body-sm text-success">{t('saved')}</span>}
        {state.error && <span className="text-body-sm text-destructive">{t(`errors.${state.error}`)}</span>}
      </div>
    </form>
  );
}
