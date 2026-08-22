'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, MailCheck, Plane, Store, UserPlus } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { signUp, type AuthState } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const initial: AuthState = {};

type Role = 'traveler' | 'business_owner';

export function RegisterForm() {
  const t = useTranslations('auth.register');
  const tErr = useTranslations('auth.errors');
  const tCheck = useTranslations('auth.checkEmail');
  const [state, formAction, pending] = useActionState(signUp, initial);
  const [role, setRole] = useState<Role>('traveler');

  // Signup succeeded but the address is unconfirmed — there is nothing more for
  // the user to do here, so replace the form rather than leaving it fillable.
  if (state.pendingEmail) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success/10">
          <MailCheck className="size-7 text-success" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold">{tCheck('title')}</h2>
        <p className="text-muted-foreground">
          {tCheck('body', { email: state.pendingEmail })}
        </p>
      </div>
    );
  }

  const roles: Array<{ value: Role; label: string; hint: string; Icon: typeof Plane }> = [
    { value: 'traveler', label: t('roleTraveler'), hint: t('roleTravelerHint'), Icon: Plane },
    { value: 'business_owner', label: t('roleBusiness'), hint: t('roleBusinessHint'), Icon: Store },
  ];

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="role" value={role} />

      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{tErr(state.error)}</AlertDescription>
        </Alert>
      )}

      <fieldset className="space-y-2.5">
        <legend className="sr-only">{t('subtitle')}</legend>
        {roles.map(({ value, label, hint, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setRole(value)}
            aria-pressed={role === value}
            className={cn(
              'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors',
              role === value
                ? 'border-primary bg-primary/6 ring-1 ring-primary/30'
                : 'hover:bg-secondary',
            )}
          >
            <Icon
              className={cn('mt-0.5 size-5 shrink-0', role === value ? 'text-primary' : 'text-muted-foreground')}
              aria-hidden
            />
            <span>
              <span className="block font-medium">{label}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{hint}</span>
            </span>
          </button>
        ))}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="fullName">{t('fullName')}</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="text-xs text-muted-foreground">
          {t('passwordHint')}
        </p>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          t('submitting')
        ) : (
          <>
            <UserPlus className="size-4" aria-hidden />
            {t('submit')}
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </form>
  );
}
