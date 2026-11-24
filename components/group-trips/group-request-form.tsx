'use client';

import { useActionState, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, Send } from 'lucide-react';

import { useRouter } from '@/i18n/navigation';
import { submitGroupRequest, type GroupRequestState } from '@/lib/group-trips/actions';
import { GUIDE_SPECIALTIES } from '@/lib/tour-guides/constants';
import { HONEYPOT_FIELD } from '@/lib/leads/validate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

const KINDS = ['church', 'school', 'backpackers', 'other'] as const;

/**
 * One request to local guides for a group trip. It becomes an ordinary
 * enquiry, so replies, quotes, negotiation and BOOKED are the ones the site
 * already has; the confirmation page is the same one too.
 */
export function GroupRequestForm({ defaultKind }: { defaultKind?: (typeof KINDS)[number] }) {
  const t = useTranslations('groupTrips.form');
  const tGuide = useTranslations('tourGuides');
  const locale = useLocale();
  const router = useRouter();
  const [kind, setKind] = useState<(typeof KINDS)[number]>(defaultKind ?? 'church');
  const [state, action, pending] = useActionState<GroupRequestState, FormData>(submitGroupRequest, {});

  useEffect(() => {
    if (state.reference) {
      router.push({
        pathname: '/request-quote/sent',
        query: { ref: state.reference, ...(state.matched ? { matched: String(state.matched) } : {}) },
      });
    }
  }, [state.reference, state.matched, router, locale]);

  return (
    <form action={action} className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD}>Leave this empty</label>
        <input id={HONEYPOT_FIELD} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input type="hidden" name="sourceUrl" value="group-trips" />

      <fieldset>
        <legend className="text-body-sm font-semibold">{t('who')}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {KINDS.map((k) => (
            <label key={k} className="cursor-pointer">
              <input type="radio" name="groupKind" value={k} checked={kind === k} onChange={() => setKind(k)} className="peer sr-only" />
              <span className="block rounded-xl border px-3 py-2.5 text-center text-body-sm font-medium transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
                {t(`kind.${k}`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="gr-org">{t(kind === 'backpackers' ? 'organisationOptional' : 'organisation')}</Label>
          <Input id="gr-org" name="organisation" maxLength={160} placeholder={t(`organisationPlaceholder.${kind}`)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gr-name">{t('name')}</Label>
          <Input id="gr-name" name="fullName" required autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gr-email">{t('email')}</Label>
          <Input id="gr-email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gr-phone">{t('phone')}</Label>
          <Input id="gr-phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gr-region">{t('where')}</Label>
          <Input id="gr-region" name="destinationOther" placeholder={t('wherePlaceholder')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="gr-adults">{t('adults')}</Label>
            <Input id="gr-adults" name="adults" type="number" min={1} max={40} defaultValue={12} inputMode="numeric" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gr-children">{t('children')}</Label>
            <Input id="gr-children" name="children" type="number" min={0} max={40} defaultValue={0} inputMode="numeric" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="gr-days">{t('days')}</Label>
            <Input id="gr-days" name="days" type="number" min={1} max={30} defaultValue={5} inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gr-budget">{t('budget')}</Label>
            <Input id="gr-budget" name="budgetPerPerson" type="number" min={0} inputMode="numeric" placeholder="45" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gr-start">{t('from')}</Label>
          <Input id="gr-start" name="travelStart" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gr-end">{t('to')}</Label>
          <Input id="gr-end" name="travelEnd" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gr-stay">{t('stay')}</Label>
          <Select id="gr-stay" name="stay" defaultValue="hostel">
            <option value="hostel">{t('stayKind.hostel')}</option>
            <option value="homestay">{t('stayKind.homestay')}</option>
            <option value="guesthouse">{t('stayKind.guesthouse')}</option>
          </Select>
        </div>
      </div>

      <fieldset>
        <legend className="text-body-sm font-semibold">{t('interests')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {GUIDE_SPECIALTIES.map((s) => (
            <label key={s} className="cursor-pointer">
              <input type="checkbox" name="interests" value={s} className="peer sr-only" />
              <span className="inline-block rounded-full border px-3 py-1.5 text-body-sm transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
                {tGuide(`specialty.${s}`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="gr-msg">{t('message')}</Label>
        <Textarea id="gr-msg" name="message" rows={4} required minLength={10} maxLength={4000} placeholder={t(`messagePlaceholder.${kind}`)} />
      </div>

      {kind === 'school' && <p className="rounded-xl bg-muted p-3 text-caption">{t('schoolNote')}</p>}
      {state.error && <p className="text-body-sm text-destructive">{t(`errors.${state.error}`)}</p>}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
        {t('submit')}
      </Button>
      <p className="text-caption text-muted-foreground">{t('afterSubmit')}</p>
    </form>
  );
}
