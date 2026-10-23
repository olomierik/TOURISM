'use client';

import { useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Eye, EyeOff, Plane, Store, UserPlus } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { signUp, type AuthState } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const initial: AuthState = {};

type Role = 'traveler' | 'business_owner';

/**
 * Four things: which kind of account, name, email, password. Then the person is
 * signed in and on their way; confirming the email comes afterwards (see
 * signUp), so there is no "check your inbox" stop here any more.
 */
export function RegisterForm() {
  const t = useTranslations('auth.register');
  const tErr = useTranslations('auth.errors');
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(signUp, initial);
  // ?as=business from "List your business", so an operator does not have to
  // find the switch.
  const [role, setRole] = useState<Role>(
    searchParams.get('as') === 'business' ? 'business_owner' : 'traveler',
  );
  const [showPassword, setShowPassword] = useState(false);
  const next = searchParams.get('next') ?? '';

  const roles: Array<{ value: Role; label: string; Icon: typeof Plane }> = [
    { value: 'traveler', label: t('roleTraveler'), Icon: Plane },
    { value: 'business_owner', label: t('roleBusiness'), Icon: Store },
  ];

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>
            {tErr(state.error)}
            {state.error === 'emailInUse' && (
              <>
                {' '}
                <Link
                  href={next ? { pathname: '/login', query: { next } } : '/login'}
                  className="font-semibold underline"
                >
                  {t('signIn')}
                </Link>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* One row of two, not two cards: the choice matters for where the
          person lands, but it should not be the biggest thing on the page. */}
      <fieldset>
        {/* The page heading already says this; screen readers still get it. */}
        <legend className="sr-only">{t('subtitle')}</legend>
        <div className="grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
          {roles.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setRole(value)}
              aria-pressed={role === value}
              className={cn(
                'flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors',
                role === value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {role === 'business_owner' ? t('roleBusinessHint') : t('roleTravelerHint')}
        </p>
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
        {/* Shown on request instead of a second "repeat password" box: one
            field to fill, and the person can check what they typed. */}
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={8}
            required
            aria-describedby="password-hint"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? t('hidePassword') : t('showPassword')}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
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
        <Link
          href={next ? { pathname: '/login', query: { next } } : '/login'}
          className="font-medium text-primary hover:underline"
        >
          {t('signIn')}
        </Link>
      </p>
    </form>
  );
}
