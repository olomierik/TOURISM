'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Store } from 'lucide-react';

import { createBusiness, type DashboardState } from '@/lib/dashboard/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PinLocation } from '@/components/dashboard/pin-location';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const initial: DashboardState = {};

export function CreateBusinessForm() {
  const t = useTranslations('dashboard');
  const tErr = useTranslations('dashboard.errors');
  const [state, formAction, pending] = useActionState(createBusiness, initial);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{tErr(state.error)}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">{t('createName')}</Label>
        <Input id="name" name="name" required autoComplete="organization" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tagline">{t('createTagline')}</Label>
        <Input id="tagline" name="tagline" maxLength={120} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">{t('createCity')}</Label>
          <Input id="city" name="city" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t('createEmail')}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">{t('website')}</Label>
        <Input
          id="website"
          name="website"
          type="url"
          inputMode="url"
          placeholder="https://"
          autoComplete="url"
        />
        <p className="text-xs text-muted-foreground">{t('createWebsiteHint')}</p>
      </div>

      {/* Optional, and asked for here rather than only in the profile: an
          operator filling this in is usually sitting at the place they are
          describing, which is the one moment the answer is free. */}
      <PinLocation latitude={null} longitude={null} precision={null} warnIfMissing={false} />

      {/* Photographs cannot be uploaded until the listing exists — an upload
          has to be attached to something, and the storage policies check the
          owner of that something. So this says where they go instead of
          offering a control that could not work yet. */}
      <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        {t('createPhotosNext')}
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">{t('createPhone')}</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp">{t('createWhatsapp')}</Label>
          <Input id="whatsapp" name="whatsapp" type="tel" />
        </div>
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? (
          t('creating')
        ) : (
          <>
            <Store className="size-4" aria-hidden />
            {t('createSubmit')}
          </>
        )}
      </Button>
    </form>
  );
}
