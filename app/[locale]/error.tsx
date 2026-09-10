'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

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
