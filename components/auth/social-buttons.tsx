'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { startOAuth } from '@/lib/auth/actions';
import type { SocialProvider } from '@/lib/auth/providers';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Google and Apple wordmarks.
 *
 * Inlined as SVG rather than pulled from an icon set: both companies publish
 * brand requirements for their sign-in buttons, and lucide's generic glyphs are
 * neither the right marks nor licensed for the purpose.
 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden focusable="false">
      <path d="M17.05 12.54c-.03-2.62 2.14-3.88 2.24-3.94-1.22-1.79-3.12-2.03-3.8-2.06-1.62-.16-3.16.95-3.98.95-.82 0-2.09-.93-3.43-.9-1.77.02-3.4 1.03-4.31 2.61-1.84 3.19-.47 7.91 1.32 10.5.87 1.27 1.91 2.69 3.28 2.64 1.32-.05 1.82-.85 3.41-.85 1.59 0 2.04.85 3.43.83 1.42-.03 2.32-1.29 3.19-2.57 1-1.47 1.42-2.9 1.44-2.97-.03-.01-2.76-1.06-2.79-4.2zM14.46 4.6c.72-.88 1.21-2.1 1.08-3.31-1.04.04-2.3.69-3.05 1.56-.67.78-1.25 2.02-1.09 3.21 1.16.09 2.34-.59 3.06-1.46z" />
    </svg>
  );
}

const MARKS: Record<SocialProvider, () => React.JSX.Element> = {
  google: GoogleMark,
  apple: AppleMark,
};

/**
 * Social sign-in buttons for whichever providers the project has enabled.
 *
 * Renders nothing when the list is empty, so the divider and the buttons appear
 * together or not at all — a lone "or continue with" above empty space is worse
 * than no social sign-in.
 */
export function SocialButtons({ providers }: { providers: SocialProvider[] }) {
  const t = useTranslations('auth.social');
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [failed, setFailed] = useState(false);

  if (!providers.length) return null;

  async function go(provider: SocialProvider) {
    setBusy(provider);
    setFailed(false);
    const result = await startOAuth(provider, searchParams.get('next') ?? undefined);
    if (result.url) {
      // assign() rather than setting location.href: the compiler's immutability
      // rule treats the assignment as mutating a value from outside the
      // component, and this is a full-page navigation to the provider either way.
      window.location.assign(result.url);
      return; // leave the spinner running through the navigation
    }
    setBusy(null);
    setFailed(true);
  }

  return (
    <div className="space-y-4">
      {failed && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{t('failed')}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2.5">
        {providers.map((p) => {
          const Mark = MARKS[p];
          return (
            <Button
              key={p}
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={busy !== null}
              onClick={() => go(p)}
            >
              {busy === p ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Mark />}
              {t(`continueWith.${p}`)}
            </Button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{t('or')}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
