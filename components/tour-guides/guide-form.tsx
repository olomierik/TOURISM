'use client';

import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { useRouter } from '@/i18n/navigation';
import { createTourGuide, updateTourGuide, type GuideFormState } from '@/lib/tour-guides/actions';
import { GROUP_AUDIENCES, GUIDE_LANGUAGES, GUIDE_SPECIALTIES } from '@/lib/tour-guides/constants';
import type { TourGuideProfile } from '@/lib/tour-guides/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

/** Tap-to-select chips over real checkboxes, so the form posts them as-is. */
function Chips({ name, options, chosen, label }: { name: string; options: readonly string[]; chosen: string[]; label: (v: string) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o} className="cursor-pointer">
          <input type="checkbox" name={name} value={o} defaultChecked={chosen.includes(o)} className="peer sr-only" />
          <span className="inline-block rounded-full border px-3 py-1.5 text-body-sm transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40">
            {label(o)}
          </span>
        </label>
      ))}
    </div>
  );
}

/**
 * The guide's sign-up and, later, their profile editor: one form, built for a
 * phone. Only name and phone are required; everything else helps groups
 * choose and can be filled in later.
 */
export function GuideForm({ guide, defaultEmail }: { guide: TourGuideProfile | null; defaultEmail?: string | null }) {
  const t = useTranslations('tourGuides');
  const router = useRouter();
  const [state, action, pending] = useActionState<GuideFormState, FormData>(guide ? updateTourGuide : createTourGuide, {});

  useEffect(() => {
    if (state.success && !guide) router.push('/tour-guides/verify');
  }, [state.success, guide, router]);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="g-name">{t('form.name')}</Label>
          <Input id="g-name" name="name" required maxLength={120} defaultValue={guide?.name ?? ''} placeholder={t('form.namePlaceholder')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="g-phone">{t('form.phone')}</Label>
          <Input id="g-phone" name="phone" type="tel" required inputMode="tel" defaultValue={guide?.phone ?? ''} placeholder="+255 7xx xxx xxx" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="g-wa">{t('form.whatsapp')}</Label>
          <Input id="g-wa" name="whatsapp" type="tel" inputMode="tel" defaultValue={guide?.whatsapp ?? ''} placeholder={t('form.whatsappPlaceholder')} />
        </div>
        {!guide && (
          <div className="space-y-1.5">
            <Label htmlFor="g-email">{t('form.email')}</Label>
            <Input id="g-email" name="email" type="email" defaultValue={defaultEmail ?? ''} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="g-city">{t('form.city')}</Label>
          <Input id="g-city" name="city" defaultValue={guide?.city ?? ''} placeholder="Arusha" />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-body-sm font-semibold">{t('form.kind')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(['community', 'licensed'] as const).map((k) => (
            <label key={k} className="flex cursor-pointer items-start gap-2 rounded-xl border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-subtle">
              <input type="radio" name="guideKind" value={k} defaultChecked={(guide?.guideKind ?? 'community') === k} className="mt-1" />
              <span>
                <span className="block font-medium">{t(`kind.${k}`)}</span>
                <span className="block text-caption text-muted-foreground">{t(`kind.${k}Hint`)}</span>
              </span>
            </label>
          ))}
        </div>
        <Input name="licenceNumber" maxLength={80} defaultValue={guide?.licenceNumber ?? ''} placeholder={t('form.licenceNumber')} aria-label={t('form.licenceNumber')} />
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-body-sm font-semibold">{t('form.audiences')}</legend>
        <Chips name="audiences" options={GROUP_AUDIENCES} chosen={guide?.audiences ?? [...GROUP_AUDIENCES]} label={(v) => t(`audience.${v as 'church'}`)} />
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-body-sm font-semibold">{t('form.languages')}</legend>
        <Chips name="languages" options={GUIDE_LANGUAGES} chosen={guide?.languages ?? ['english', 'swahili']} label={(v) => t(`language.${v as 'english'}`)} />
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-body-sm font-semibold">{t('form.specialties')}</legend>
        <Chips name="specialties" options={GUIDE_SPECIALTIES} chosen={guide?.specialties ?? []} label={(v) => t(`specialty.${v as 'culture'}`)} />
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="g-areas">{t('form.areas')}</Label>
        <Input id="g-areas" name="areas" defaultValue={guide?.areas.join(', ') ?? ''} placeholder={t('form.areasPlaceholder')} />
      </div>

      <div className="grid grid-cols-[1fr_6rem] gap-3 sm:grid-cols-[1fr_6rem_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="g-rate">{t('form.dayRate')}</Label>
          <Input id="g-rate" name="dayRate" type="number" min="0" inputMode="numeric" defaultValue={guide?.dayRate ?? ''} placeholder="40" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="g-cur">{t('form.currency')}</Label>
          <Select id="g-cur" name="dayRateCurrency" defaultValue={guide?.dayRateCurrency ?? 'USD'}>
            <option value="USD">USD</option>
            <option value="TZS">TZS</option>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5 sm:col-span-1">
          <Label htmlFor="g-max">{t('form.maxGroup')}</Label>
          <Input id="g-max" name="maxGroup" type="number" min="1" max="500" inputMode="numeric" defaultValue={guide?.maxGroup ?? ''} placeholder="20" />
        </div>
      </div>

      {!guide && (
        <div className="space-y-1.5">
          <Label htmlFor="g-tag">{t('form.tagline')}</Label>
          <Input id="g-tag" name="tagline" maxLength={160} placeholder={t('form.taglinePlaceholder')} />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="g-bio">{t('form.bio')}</Label>
        <Textarea id="g-bio" name="bio" rows={4} maxLength={2000} defaultValue={guide?.bio ?? ''} placeholder={t('form.bioPlaceholder')} />
      </div>

      {state.error && <p className="text-body-sm text-destructive">{t(`form.errors.${state.error}`)}</p>}
      {state.success && guide && <p className="text-body-sm text-success">{t('form.saved')}</p>}
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {guide ? t('form.save') : t('form.submit')}
      </Button>
    </form>
  );
}
