'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MailWarning, X } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { resendEmailConfirmation, type ResendState } from '@/lib/auth/actions';

const DISMISSED = 'et:verify-banner-dismissed';

/**
 * A slim bar under the header while the signed-in account's email address is
 * unconfirmed, with "Resend link".
 *
 * Accounts work from the moment they are created (see signUp), so nothing is
 * blocked here; this is the reminder that replaced the wall. Confirming lets
 * operators reply by email and makes "forgot password" possible, which is what
 * the bar says.
 *
 * Reads the session cookie (getSession, no network) on every navigation, as the
 * header does: signing up is a server action that ends in a client-side
 * navigation, so a check made once on mount would miss it.
 */
export function VerifyEmailBanner() {
  const t = useTranslations('auth.verifyBanner');
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  // Read once, lazily. The server renders null either way (no email yet), so
  // this cannot cause a hydration mismatch.
  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window !== 'undefined' && sessionStorage.getItem(DISMISSED) === '1';
    } catch {
      // Storage blocked: the bar simply stays.
      return false;
    }
  });
  const [state, setState] = useState<ResendState>({ status: 'idle' });
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!active) return;
      // Only an explicit false: accounts made before this flag existed were
      // confirmed the old way and carry no flag at all.
      setEmail(user?.app_metadata?.email_verified === false ? (user.email ?? null) : null);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  if (!email || dismissed) return null;

  const message =
    state.status === 'sent'
      ? t('sent')
      : state.status === 'rateLimited'
        ? t('rateLimited')
        : state.status === 'failed'
          ? t('failed')
          : null;

  return (
    <div role="status" className="border-b bg-warning/10">
      <div className="container-page flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 text-sm">
        <MailWarning className="size-4 shrink-0 text-warning" aria-hidden />
        <p className="min-w-0 flex-1">
          {t('text', { email })}{' '}
          <span className="text-muted-foreground">{t('why')}</span>
        </p>
        {message ? (
          <span className="font-medium" aria-live="polite">
            {message}
          </span>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setState(await resendEmailConfirmation());
              })
            }
            className="font-semibold text-primary hover:underline disabled:opacity-60"
          >
            {pending ? t('sending') : t('resend')}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(DISMISSED, '1');
            } catch {
              // ignore
            }
          }}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t('dismiss')}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
