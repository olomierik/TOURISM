'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { initializePaddle, type Paddle } from '@paddle/paddle-js';

/**
 * The Paddle checkout, opened inline on our own page.
 *
 * Paddle has no off-site hosted checkout. `transaction.checkout.url` points at
 * *this* page with `?_ptxn=<transaction id>` appended, and expects Paddle.js to
 * be here to open the checkout for it. That is why a page exists at all — it is
 * not a design choice, it is the integration contract.
 *
 * Card details are entered in Paddle's iframe, not in this component and not in
 * any field this origin can read, so the PCI position is the same as the
 * Flutterwave redirect: out of scope.
 *
 * Two states this deliberately renders rather than hides:
 *
 *   **No transaction id.** Somebody reached /pay directly. Saying so is more
 *   use than an empty page or a spinner that never resolves.
 *
 *   **Paddle failed to load.** An ad blocker, an offline device, or a missing
 *   client token. The operator needs to know the checkout did not open, not
 *   watch a blank box and conclude they have paid.
 */
export function PaddleCheckout({
  token,
  environment,
  transactionId,
  locale,
}: {
  token: string;
  environment: 'production' | 'sandbox';
  transactionId: string | null;
  locale: string;
}) {
  const t = useTranslations('pay');
  const [state, setState] = React.useState<'loading' | 'open' | 'failed'>('loading');

  React.useEffect(() => {
    if (!transactionId) return;

    let cancelled = false;
    let instance: Paddle | undefined;

    // Read once, here, rather than as a prop or a dependency. The server cannot
    // know the visitor's preference (ThemeScript sets the class before first
    // paint), and making the theme reactive would tear down and reopen the
    // checkout mid-payment every time somebody hit the toggle.
    const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

    initializePaddle({
      token,
      environment,
      checkout: {
        settings: {
          displayMode: 'inline',
          frameTarget: 'paddle-checkout-frame',
          frameInitialHeight: 450,
          frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
          theme,
          locale,
        },
      },
    })
      .then((paddle) => {
        if (cancelled) return;
        if (!paddle) {
          setState('failed');
          return;
        }
        instance = paddle;
        paddle.Checkout.open({ transactionId });
        setState('open');
      })
      .catch((err: unknown) => {
        console.error('[paddle] checkout failed to open', err);
        if (!cancelled) setState('failed');
      });

    return () => {
      cancelled = true;
      // Closing on unmount stops an overlay surviving a client-side navigation
      // away from this page, which would leave a payment form floating over an
      // unrelated screen.
      try {
        instance?.Checkout.close();
      } catch {
        // Already closed, or never opened. Nothing to do.
      }
    };
  }, [token, environment, transactionId, locale]);

  if (!transactionId) {
    return <p className="text-sm text-muted-foreground">{t('noTransaction')}</p>;
  }

  return (
    <div className="space-y-4">
      {state === 'loading' && <p className="text-sm text-muted-foreground">{t('loading')}</p>}
      {state === 'failed' && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          {t('failed')}
        </p>
      )}
      {/* Paddle mounts its iframe into this element by class name, which is
          what frameTarget above refers to. It must exist before open() runs. */}
      <div className="paddle-checkout-frame" />
    </div>
  );
}
