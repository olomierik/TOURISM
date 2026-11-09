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
 * > **Resolved 2026-11-09, Erick's call.** "I dont use flutterwave, I use
 * > PADDLE." The default is now `paddle` and there is no fall-through to
 * > Flutterwave.
 *
 * That accepts the cost the paragraph above describes — card-only, no M-Pesa,
 * no TZS — and it is the owner's decision to accept, not a detail to be
 * quietly re-litigated here. What matters for the code is the second half:
 * **no fallback.** Falling through to a rail the business does not use is
 * worse than selling nothing, because it takes real money through an account
 * nobody is reconciling. When Paddle cannot take a payment, `startCheckout`
 * now says so.
 *
 * The Flutterwave adapter is left in place rather than deleted. It is a
 * working integration, its webhook still reconciles the payments it already
 * took, and "we might sell in shillings later" is a decision for a day when
 * somebody asks for it.
 */
export type PlatformProvider = 'flutterwave' | 'paddle';

/**
 * Flutterwave answers from the environment alone, Paddle has to read which
 * mode it is in from the database, so the predicates are awaited rather than
 * called. Awaiting a plain boolean costs nothing and keeps the two uniform.
 */
const CONFIGURED: Record<PlatformProvider, () => boolean | Promise<boolean>> = {
  flutterwave: flutterwaveConfigured,
  paddle: paddleConfigured,
};

/**
 * The rail used when `PAYMENTS_PROVIDER` is unset or names something unknown.
 *
 * One entry, not an order. Paddle is the rail this platform sells on, and if
 * it cannot take a payment the honest answer is that checkout is unavailable —
 * see the decision recorded above.
 */
const DEFAULT_PROVIDER: PlatformProvider = 'paddle';

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
export async function activeProvider(): Promise<PlatformProvider | null> {
  const preferred = process.env.PAYMENTS_PROVIDER?.trim().toLowerCase();

  if (preferred && !isProvider(preferred)) {
    console.warn(`[payments] PAYMENTS_PROVIDER=${preferred} is not a known provider.`);
  }

  const chosen = isProvider(preferred) ? preferred : DEFAULT_PROVIDER;

  if (await CONFIGURED[chosen]()) return chosen;

  // Named or defaulted but not usable is worth saying out loud: it is the shape
  // of a deploy that half-happened. It returns null rather than trying the
  // other rail, which is the whole point of the 2026-11-09 decision — a
  // fallback would hide this by charging through an account nobody reconciles.
  console.warn(`[payments] ${chosen} is the selected rail but cannot take a payment.`);
  return null;
}
