'use client';

import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, UserPlus } from 'lucide-react';

import { joinDeparture, type JoinState } from '@/lib/group-trips/departure-actions';
import { HONEYPOT_FIELD } from '@/lib/leads/validate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

/** Join an open group trip: who you are and how many seats. */
export function JoinForm({ departureId, seatsLeft }: { departureId: string; seatsLeft: number }) {
  const t = useTranslations('groupTrips.join');
  const tForm = useTranslations('groupTrips.form');
  const [state, action, pending] = useActionState<JoinState, FormData>(joinDeparture.bind(null, departureId), {});
  useEffect(() => {
    if (state.url) window.location.href = state.url;
  }, [state.url]);

  return (
    <form action={action} className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD}>Leave this empty</label>
        <input id={HONEYPOT_FIELD} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <h2 className="text-lg font-semibold">{t('formTitle')}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="j-name">{tForm('name')}</Label>
          <Input id="j-name" name="fullName" required autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="j-email">{tForm('email')}</Label>
          <Input id="j-email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="j-phone">{tForm('phone')}</Label>
          <Input id="j-phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="j-kind">{tForm('who')}</Label>
          <Select id="j-kind" name="groupKind" defaultValue="backpackers">
            {(['church', 'school', 'backpackers', 'other'] as const).map((k) => (
              <option key={k} value={k}>
                {tForm(`kind.${k}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="j-adults">{tForm('adults')}</Label>
          <Input id="j-adults" name="adults" type="number" min={1} max={Math.max(1, seatsLeft)} defaultValue={1} inputMode="numeric" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="j-children">{tForm('children')}</Label>
          <Input id="j-children" name="children" type="number" min={0} max={Math.max(0, seatsLeft - 1)} defaultValue={0} inputMode="numeric" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="j-msg">{t('message')}</Label>
        <Textarea id="j-msg" name="message" rows={3} required minLength={10} maxLength={4000} placeholder={t('messagePlaceholder')} />
      </div>
      {state.error && <p className="text-body-sm text-destructive">{t(`errors.${state.error}`)}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending || seatsLeft === 0}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
        {seatsLeft === 0 ? t('full') : t('submit')}
      </Button>
      <p className="text-caption text-muted-foreground">{t('afterJoin')}</p>
    </form>
  );
}
