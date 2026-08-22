'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, LogOut } from 'lucide-react';

import { updateProfile, signOut, type AuthState } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { locales, localeMeta } from '@/i18n/routing';
import type { Tables } from '@/lib/supabase/database.types';

const initial: AuthState = {};

export function AccountForm({ profile }: { profile: Tables<'profiles'> }) {
  const t = useTranslations('auth.account');
  const tErr = useTranslations('auth.errors');
  const [state, formAction, pending] = useActionState(updateProfile, initial);

  return (
    <div className="space-y-8">
      <form action={formAction} className="space-y-5">
        {state.success && (
          <Alert variant="success">
            <Check className="size-4" aria-hidden />
            <AlertDescription>{t('saved')}</AlertDescription>
          </Alert>
        )}
        {state.error && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" aria-hidden />
            <AlertDescription>{tErr(state.error)}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullName">{t('fullName')}</Label>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={profile.full_name ?? ''}
            autoComplete="name"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">{t('phone')}</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={profile.phone ?? ''}
              autoComplete="tel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">{t('whatsapp')}</Label>
            <Input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              defaultValue={profile.whatsapp ?? ''}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="locale">{t('language')}</Label>
          <select
            id="locale"
            name="locale"
            defaultValue={profile.locale}
            className="flex h-11 w-full rounded-lg border bg-background px-3.5 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {locales.map((l) => (
              <option key={l} value={l}>
                {localeMeta[l].native}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-4">
          <input
            id="marketingOptIn"
            name="marketingOptIn"
            type="checkbox"
            defaultChecked={profile.marketing_opt_in}
            className="mt-0.5 size-4 accent-[var(--primary)]"
          />
          <Label htmlFor="marketingOptIn" className="font-normal leading-relaxed">
            {t('marketing')}
          </Label>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? t('saving') : t('save')}
        </Button>
      </form>

      {/* Separate form: nesting it inside the profile form would submit both. */}
      <form action={signOut} className="border-t pt-6">
        <Button type="submit" variant="ghost" className="text-muted-foreground">
          <LogOut className="size-4" aria-hidden />
          {t('signOut')}
        </Button>
      </form>
    </div>
  );
}
