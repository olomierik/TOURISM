import { Environment, Paddle, type CurrencyCode, type EventEntity } from '@paddle/paddle-node-sdk';

/**
 * Paddle adapter — a **sibling** of `flutterwave.ts`, not a replacement.
 *
 * `flutterwave.ts` says why it was chosen: operators here are paid in shillings
 * and many of them hold no card, so M-Pesa, Tigo Pesa and Airtel Money are
 * "the difference between a subscription an operator can buy and one they
 * cannot." Paddle settles none of those, and cannot bill in TZS or KES at all
 * (see `PADDLE_CURRENCIES` below). Nothing here changes that trade-off; it adds
 * a second rail and leaves the choice to `provider.ts`.
 *
 * What Paddle *is* good for, and why it is worth having:
 *
 *   It is a **Merchant of Record**. Paddle becomes the seller, and with that
 *   takes on sales tax and VAT registration, remittance and invoicing in 300+
 *   markets, plus chargeback liability and buyer support. For a one-person
 *   company selling a subscription to operators in several countries, that is
 *   a compliance burden that otherwise has no owner. Flutterwave is a payment
 *   gateway and takes on none of it.
 *
 * Three things about Paddle that shape every decision in this file:
 *
 *   1. **There is no off-site hosted checkout.** Flutterwave returns a link to
 *      `checkout.flutterwave.com`. Paddle returns a link to *our own* approved
 *      domain with `?_ptxn=<transaction id>` appended, and expects that page to
 *      load Paddle.js, which opens the checkout in its own iframe. That is why
 *      `app/[locale]/pay` exists. Card details still never touch this origin —
 *      the iframe is Paddle's — so the PCI position is unchanged.
 *
 *   2. **The catalog stays here.** Paddle normally wants products and prices
 *      created in its dashboard, which would make `subscription_plans` a copy
 *      of something it does not own. Non-catalog items let a transaction carry
 *      the price and product inline instead, so the database remains the one
 *      place a plan's price is written down.
 *
 *   3. **It cannot be exercised without an account.** Paddle requires the
 *      domain to be approved by a human and a default payment link configured
 *      before any transaction can be created at all. Everything here is
 *      therefore gated behind `paddleConfigured()`, exactly as Flutterwave is:
 *      an operator must never meet a Subscribe button that leads to an error.
 *
 * Server-only. The API key must never reach a bundle; the *client* token
 * (`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`) is a different, publishable credential
 * and is the only one the browser sees.
 */

/**
 * The currencies Paddle bills in.
 *
 * Copied from the SDK's own `CurrencyCode`, and narrowed to a runtime list
 * because `subscription_plans.currency` is a `char(3)` the compiler cannot
 * check. **TZS is not on it, and neither is KES** — the two currencies this
 * market actually quotes in. A Paddle plan is a USD plan, which is a product
 * decision disguised as a type constraint, so it is stated here loudly rather
 * than discovered as a 400 from the API.
 */
const PADDLE_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CLP', 'HKD', 'SGD', 'SEK',
  'ARS', 'BRL', 'CNY', 'COP', 'CZK', 'DKK', 'HUF', 'ILS', 'INR', 'KRW', 'MXN',
  'NOK', 'NZD', 'PEN', 'PLN', 'RUB', 'THB', 'TRY', 'TWD', 'UAH', 'VND', 'ZAR',
] as const satisfies readonly CurrencyCode[];

export function isPaddleCurrency(code: string): code is CurrencyCode {
  return (PADDLE_CURRENCIES as readonly string[]).includes(code.toUpperCase());
}

/**
 * Currencies with no minor unit.
 *
 * Paddle takes amounts in the smallest unit of the currency, so $50.00 is
 * `"5000"` but ¥5000 is `"5000"` too. Getting this wrong charges a customer a
 * hundred times the intended price, so the list is deliberately short and
 * anything not on it is treated as two decimal places — the common case, and
 * the one every currency this project plausibly uses falls into.
 */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'CLP', 'VND']);

/**
 * Converts a plan price to the minor units Paddle expects.
 *
 * Throws rather than rounds when the amount has more precision than the
 * currency does. A price of 50.005 USD is a data problem, and silently
 * charging 50.01 would hide it behind a correct-looking invoice.
 */
export function toMinorUnits(amount: number, currency: CurrencyCode): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Paddle: refusing to bill a non-positive amount (${amount})`);
  }

  const places = ZERO_DECIMAL.has(currency) ? 0 : 2;
  const scaled = amount * 10 ** places;
  const rounded = Math.round(scaled);

  // Floating-point slack only: 19.99 * 100 lands on 1998.9999999999998, which
  // is fine. 50.005 * 100 lands on 500.5, which is not.
  if (Math.abs(scaled - rounded) > 1e-6) {
    throw new Error(
      `Paddle: ${amount} has more precision than ${currency} (${places} dp) can express`,
    );
  }

  return String(rounded);
}

/**
 * Whether Paddle is switched on.
 *
 * All three must be present: the API key signs server calls, the webhook
 * secret is the only thing standing between this app and a forged "paid"
 * event, and the client token is what the pay page needs to open a checkout.
 * Two out of three is a half-configured integration that fails at the worst
 * moment, so it counts as off.
 */
export function paddleConfigured(): boolean {
  return Boolean(
    process.env.PADDLE_API_KEY &&
      process.env.PADDLE_WEBHOOK_SECRET &&
      process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
  );
}

/**
 * Sandbox unless explicitly told otherwise.
 *
 * Defaulting to production would mean a missing environment variable takes
 * real money. Defaulting to sandbox means it takes none and somebody notices.
 */
export function paddleEnvironment(): Environment {
  return process.env.PADDLE_ENV === 'production' ? Environment.production : Environment.sandbox;
}

let cached: Paddle | null = null;

function client(): Paddle {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error('PADDLE_API_KEY is not set');
  cached ??= new Paddle(key, { environment: paddleEnvironment() });
  return cached;
}

export type PaddleCheckoutRequest = {
  /** Our own reference, carried through and returned on the webhook. */
  reference: string;
  amount: number;
  currency: string;
  /** What the line item is called on the checkout and the invoice. */
  planName: string;
  description: string;
  customer: { email: string; name?: string | null };
  meta: Record<string, string>;
};

export type PaddleCheckout = {
  transactionId: string;
  /** Our own `/pay` page plus `?_ptxn=`, not a Paddle-hosted page. */
  checkoutUrl: string;
};

/**
 * Opens a subscription checkout and returns the URL to send the operator to.
 *
 * The price and the product are both passed inline rather than referenced by a
 * `pri_`/`pro_` id, so `subscription_plans` stays the only place a price is
 * written down. Paddle creates `custom`-typed entities for them, which do not
 * join the dashboard catalog.
 *
 * `billingCycle` is what makes this a subscription rather than a one-off:
 * Paddle creates the subscription itself once the transaction completes, and
 * tells us through `subscription.created`. We provision from the webhook.
 */
export async function createCheckout(req: PaddleCheckoutRequest): Promise<PaddleCheckout> {
  const currency = req.currency.toUpperCase();
  if (!isPaddleCurrency(currency)) {
    throw new Error(
      `Paddle cannot bill in ${currency}. Supported: ${PADDLE_CURRENCIES.join(', ')}`,
    );
  }

  const tx = await client().transactions.create({
    items: [
      {
        quantity: 1,
        price: {
          name: req.planName,
          description: req.description,
          unitPrice: { amount: toMinorUnits(req.amount, currency), currencyCode: currency },
          billingCycle: { interval: 'month', frequency: 1 },
          product: {
            name: req.planName,
            // A directory listing subscription is software-as-a-service, not a
            // digital good. The category decides which tax rate Paddle remits
            // in each market, so it is not a cosmetic field.
            taxCategory: 'saas',
            description: req.description,
          },
        },
      },
    ],
    currencyCode: currency,
    // Comes back verbatim on the webhook, so the callback does not have to
    // re-derive which business bought which plan from the amount.
    customData: req.meta,
  });

  const checkoutUrl = tx.checkout?.url;
  if (!checkoutUrl) {
    throw new Error(
      'Paddle returned a transaction with no checkout URL. The default payment link ' +
        'is probably unset or the domain is not approved (Paddle > Checkout > Checkout configuration).',
    );
  }

  return { transactionId: tx.id, checkoutUrl };
}

export type VerifiedPaddleTransaction = {
  providerRef: string;
  reference: string;
  amount: number;
  currency: string;
  status: 'successful' | 'failed' | 'pending';
  method: string | null;
  customerEmail: string | null;
  subscriptionId: string | null;
  meta: Record<string, string>;
  raw: unknown;
};

/**
 * Re-reads a transaction from Paddle.
 *
 * Same rule as Flutterwave's `verifyTransaction`, and for the same reason: the
 * webhook body states its own amount, and a forged one claiming a completed
 * $149 payment would otherwise buy a plan for the cost of an HTTP request. The
 * signature proves who sent it; this proves what happened.
 *
 * The amount read back is `details.totals.grandTotal` in minor units — what the
 * customer was actually charged, tax included — converted back to major units
 * so it compares against `subscription_plans.price_monthly` on the same scale.
 */
export async function getTransaction(transactionId: string): Promise<VerifiedPaddleTransaction> {
  const tx = await client().transactions.get(transactionId);

  const totals = tx.details?.totals ?? null;
  const currency = totals?.currencyCode ?? tx.currencyCode;
  const places = ZERO_DECIMAL.has(currency) ? 0 : 2;
  const amount = totals ? Number(totals.grandTotal) / 10 ** places : 0;

  const meta = (tx.customData ?? {}) as Record<string, string>;

  // `completed` is the only status that means the money arrived. `billed` and
  // `ready` are stages on the way there, and treating either as paid would
  // grant a plan for an invoice nobody has settled.
  const status: VerifiedPaddleTransaction['status'] =
    tx.status === 'completed'
      ? 'successful'
      : tx.status === 'canceled' || tx.status === 'past_due'
        ? 'failed'
        : 'pending';

  const lastPayment = tx.payments.at(-1) ?? null;

  return {
    providerRef: tx.id,
    reference: typeof meta.reference === 'string' ? meta.reference : '',
    amount,
    currency,
    status,
    method: lastPayment?.methodDetails?.type ?? null,
    customerEmail: tx.customer?.email ?? null,
    subscriptionId: tx.subscriptionId,
    meta,
    raw: tx,
  };
}

export type WebhookResult =
  | { ok: true; event: EventEntity }
  /** The signature did not check out. Answer 401 and nothing else. */
  | { ok: false; reason: 'signature' }
  /** Signed by Paddle, but the SDK could not build an entity from it. */
  | { ok: false; reason: 'payload'; error: unknown };

/**
 * Checks the webhook signature, then parses the event.
 *
 * The two steps are separate on purpose, and the reason is worth writing down
 * because collapsing them into one `unmarshal` call looks tidier and is wrong.
 *
 * `unmarshal` verifies *and* constructs a typed entity, and it throws for
 * both. A genuinely-signed payload whose shape the SDK cannot map — a new
 * event type, a field Paddle added, anything this SDK version does not model —
 * comes back from `unmarshal` as an exception indistinguishable from a forged
 * signature. Treating that as a bad signature means answering 401 to a real
 * Paddle delivery, and Paddle retries a 401. The result is a webhook that
 * fails every few minutes forever while the dashboard says the secret is
 * wrong, which is the worst possible place to be looking.
 *
 * So `isSignatureValid` decides the security question on its own. It parses
 * `ts=…;h1=…`, rebuilds the signed payload as `${ts}:${rawBody}`, HMAC-SHA256s
 * it with the endpoint secret, compares in constant time, and rejects anything
 * whose timestamp is too old for a captured request to be replayed. Only once
 * that passes does the payload get parsed, and a parse failure is reported as
 * itself.
 *
 * The body must be the exact bytes Paddle sent. Parsing it to JSON and
 * re-serialising produces a different string and a signature that never
 * matches — which is why the route reads `request.text()` before anything else
 * touches it.
 */
export async function verifyWebhook(
  rawBody: string,
  signature: string | null,
): Promise<WebhookResult> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret || !signature) return { ok: false, reason: 'signature' };

  let valid = false;
  try {
    valid = await client().webhooks.isSignatureValid(rawBody, secret, signature);
  } catch (err) {
    // A malformed header lands here rather than returning false.
    console.warn('[paddle] could not check a webhook signature:', err);
    return { ok: false, reason: 'signature' };
  }

  if (!valid) return { ok: false, reason: 'signature' };

  try {
    return { ok: true, event: await client().webhooks.unmarshal(rawBody, secret, signature) };
  } catch (error) {
    return { ok: false, reason: 'payload', error };
  }
}
