'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

const STALE_DEPLOY = /server action|older or newer deployment|failed to find/i;
const RELOAD_KEY = 'et:stale-deploy-reload';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for the server logs / error reporting; never rendered to the user.
    console.error(error);
  }, [error]);

  // A page opened before a deploy, submitting a form after it, asks the new
  // server for an action from the old build ("Failed to find Server Action").
  // The fix is the new page, so load it, once: a reload that fails the same
  // way within a minute shows this screen rather than looping.
  const stale = STALE_DEPLOY.test(error.message ?? '');
  useEffect(() => {
    if (!stale) return;
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
      if (Date.now() - last < 60_000) return;
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
      // Storage blocked: reload anyway, the guard is only against a loop.
    }
    window.location.reload();
  }, [stale]);

  return (
    <div className="container-page flex min-h-[60svh] flex-col items-center justify-center py-section text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" aria-hidden />
      </div>
      <h1 className="mt-8 text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-4 max-w-md text-muted-foreground">Please try again. If this keeps happening, let us know.</p>
      {/* The digest is the only technical detail shown — it lets support correlate
          a user report to a server log without leaking a stack trace. */}
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-muted-foreground/60">
          {error.digest}
        </p>
      )}
      <Button onClick={reset} size="lg" className="mt-8">
        Try again
      </Button>
    </div>
  );
}
