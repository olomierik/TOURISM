'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Download, Smartphone, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Chrome / Edge / Android's deferred install prompt. Not in the DOM typings. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type State = 'unknown' | 'prompt' | 'installed' | 'manual-ios' | 'manual';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own flag for a home-screen launch.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
}

function useInstall() {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  const [state, setState] = useState<State>('unknown');
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // Read after hydration: the server cannot know any of this.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(isStandalone() ? 'installed' : isIos() ? 'manual-ios' : 'manual');
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallPromptEvent);
      setState('prompt');
    };
    const onInstalled = () => {
      setEvent(null);
      setState('installed');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (event) {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === 'accepted') setState('installed');
      setEvent(null);
      return;
    }
    // No browser prompt (iPhone, Firefox, or already dismissed): say how.
    setShowHint(true);
  }

  return { state, showHint, install };
}

/**
 * "Take it with you" — the app-install band at the foot of the home page, and
 * a compact version for the footer. The app is this website installed to the
 * home screen; pages already opened keep working without a signal.
 */
export function InstallApp({ variant = 'band', className }: { variant?: 'band' | 'compact'; className?: string }) {
  const t = useTranslations('pwa');
  const { state, showHint, install } = useInstall();

  const hint = showHint && (
    <p role="status" className="text-body-sm text-muted-foreground">
      {state === 'manual-ios' ? t('iosHint') : t('otherHint')}
    </p>
  );

  const action =
    state === 'installed' ? (
      <p className="inline-flex items-center gap-2 text-body-sm font-semibold text-success">
        <Check className="size-4" aria-hidden />
        {t('installed')}
      </p>
    ) : (
      <Button onClick={install} size={variant === 'band' ? 'lg' : 'md'} variant="primary">
        <Download aria-hidden />
        {t('install')}
      </Button>
    );

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-col items-start gap-3', className)}>
        <p className="inline-flex items-center gap-2 text-body-sm font-semibold text-foreground">
          <Smartphone className="size-4 text-primary" aria-hidden />
          {t('footerTitle')}
        </p>
        {action}
        {hint}
      </div>
    );
  }

  return (
    <section aria-labelledby="install-app-title" className={cn('container-page py-16 sm:py-20', className)}>
      <div className="card-surface mx-auto max-w-2xl px-6 py-10 text-center sm:px-10">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-subtle text-primary">
          <Smartphone className="size-6" aria-hidden />
        </span>
        <h2 id="install-app-title" className="mt-5 font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-body text-muted-foreground">{t('lead')}</p>
        <div className="mt-7 flex flex-col items-center gap-3">
          {action}
          {hint}
        </div>
        <p className="mt-6 inline-flex items-center gap-2 text-caption text-muted-foreground">
          <WifiOff className="size-3.5" aria-hidden />
          {t('note')}
        </p>
      </div>
    </section>
  );
}
