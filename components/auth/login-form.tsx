'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, LogIn } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { signIn, type AuthState } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const initial: AuthState = {};

export function LoginForm() {
  const t = useTranslations('auth.login');
  const tErr = useTranslations('auth.errors');
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(signIn, initial);

  // Set by the auth callback when a confirmation link fails.
  const callbackError = searchParams.get('error');

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={searchParams.get('next') ?? ''} />

      {(state.error || callbackError) && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>
            {state.error ? tErr(state.error) : tErr('generic')}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          // Errors are per-form rather than per-field here, so flag both inputs
          // instead of guessing which one the server rejected.
          aria-invalid={Boolean(state.error)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.error)}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          t('submitting')
        ) : (
          <>
            <LogIn className="size-4" aria-hidden />
            {t('submit')}
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t('signUp')}
        </Link>
      </p>
    </form>
  );
}
