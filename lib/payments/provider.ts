import { paymentsConfigured as flutterwaveConfigured } from './flutterwave';
import { paddleConfigured } from './paddle';

/**
 * Which rail the platform's own subscription checkout runs on.
 *
 * Two are wired up and they are not interchangeable:
 *
 *   **flutterwave** settles M-Pesa, Tigo Pesa and Airtel Money alongside
 *   cards, and bills in TZS. For an operator in Arusha without a card, this is
 *   the only one of the two that works at all.
 *
 *   **paddle** is a Merchant of Record: it registers for and remits sales tax
 *   and VAT, handles invoicing, and absorbs chargebacks. It bills cards only,
 *   and cannot bill in TZS or KES. For a buyer in Europe it is the one that
 *   keeps us compliant without a tax adviser in every market.
 *
 * So the right answer depends on who is buying, and neither is a strict
 * improvement on the other. `PAYMENTS_PROVIDER` makes it a deployment
 * decision rather than a code change.
 *
 * The default is deliberately `flutterwave`: it is what this project has
 * always used, and a missing environment variable must not silently move
 * checkout onto a rail that excludes most of the market. Falling through to
 * whichever is configured only happens when the preferred one is not.
 */
export type PlatformProvider = 'flutterwave' | 'paddle';

const CONFIGURED: Record<PlatformProvider, () => boolean> = {
  flutterwave: flutterwaveConfigured,
  paddle: paddleConfigured,
};

/** Preference order when `PAYMENTS_PROVIDER` is unset or names a dead rail. */
const FALLBACK_ORDER: PlatformProvider[] = ['flutterwave', 'paddle'];

function isProvider(value: string | undefined): value is PlatformProvider {
  return value === 'flutterwave' || value === 'paddle';
}

/**
 * The provider checkout should use, or null when none is usable.
 *
 * Null is a real answer, not a failure: `SUBSCRIPTIONS_ENABLED` is off and
 * neither provider has credentials in most environments. The subscription page
 * reads this to decide between a checkout button and an honest "not live yet"
 * notice, because a button that leads to an error tells an operator the
 * product is broken rather than unfinished.
 */
export function activeProvider(): PlatformProvider | null {
  const preferred = process.env.PAYMENTS_PROVIDER?.trim().toLowerCase();

  if (isProvider(preferred)) {
    if (CONFIGURED[preferred]()) return preferred;
    // Named but not configured is worth saying out loud. It is the shape of a
    // deploy that half-happened, and the fallback below would otherwise hide
    // it by quietly charging through the other provider.
    console.warn(
      `[payments] PAYMENTS_PROVIDER=${preferred} is set but not configured; falling back.`,
    );
  } else if (preferred) {
    console.warn(`[payments] PAYMENTS_PROVIDER=${preferred} is not a known provider.`);
  }

  return FALLBACK_ORDER.find((p) => CONFIGURED[p]()) ?? null;
}
