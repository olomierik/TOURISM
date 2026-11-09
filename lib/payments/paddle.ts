import { Environment, Paddle, type CurrencyCode, type EventEntity } from '@paddle/paddle-node-sdk';

import { createAdminClient } from '@/lib/supabase/admin';

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
 * Server-only. The API key must never reach a bundle; the *client* token is a
 * different, publishable credential and is the only one the browser sees. It
 * is read here and passed to the pay page as a prop rather than carried by a
 * `NEXT_PUBLIC_` variable — that is what lets the admin mode toggle change it
 * without a rebuild.
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
 * Sandbox or live, and where that answer comes from.
 *
 * It used to come from `PADDLE_ENV`. Migration 085 says at length why it no
 * longer does; the short version is that both halves of that arrangement
 * failed on the same afternoon. An environment variable is invisible to anyone
 * not looking at the Netlify dashboard, so when the sandbox credentials were
 * pasted in as one shared value and replaced the live ones in all five
 * contexts, nothing in the app said so. And the client token was a
 * `NEXT_PUBLIC_` variable, which Next bakes into the bundle at build time, so
 * changing mode meant a rebuild — far too much ceremony for something you may
 * need to undo in thirty seconds.
 *
 * So the mode is now a row in `platform_settings` that an admin can see and
 * flip, and the credentials are two named sets in the environment. The row
 * chooses between them; it never contains them. A toggle cannot invent a
 * secret, and a payment credential has no business in a table every admin can
 * read and every backup copies.
 */
export type PaddleMode = 'sandbox' | 'live';

export type PaddleCredentials = {
  mode: PaddleMode;
  apiKey: string;
  webhookSecret: string;
  clientToken: string;
};

/**
 * Paddle prefixes its own keys, which makes "are these really live keys?" a
 * question answerable without calling the API.
 *
 * Worth asking, because the mistake it catches has already happened here. A
 * check on the variable's *name* would have reported live while the sandbox
 * key behind it quietly took no money.
 */
const PREFIXES: Record<PaddleMode, { apiKey: string; clientToken: string }> = {
  live: { apiKey: 'pdl_live_', clientToken: 'live_' },
  sandbox: { apiKey: 'pdl_sdbx_', clientToken: 'test_' },
};

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

/** Which environment variable holds a given credential for a given mode. */
function names(mode: PaddleMode) {
  const suffix = mode === 'live' ? 'LIVE' : 'SANDBOX';
  return {
    apiKey: `PADDLE_API_KEY_${suffix}`,
    webhookSecret: `PADDLE_WEBHOOK_SECRET_${suffix}`,
    clientToken: `PADDLE_CLIENT_TOKEN_${suffix}`,
  };
}

/**
 * Read one credential, with a fallback for sandbox only.
 *
 * Sandbox falls back to the old unsuffixed names because that is what every
 * environment of this project holds today, and renaming a working variable
 * should not be the price of gaining a switch. Live gets no such fallback on
 * purpose: those same unsuffixed names contain *sandbox* keys, so a fallback
 * would make "go live" mean "keep using the test gateway, but say live".
 */
function credential(mode: PaddleMode, which: keyof ReturnType<typeof names>): string | null {
  const direct = env(names(mode)[which]);
  if (direct || mode === 'live') return direct;

  const legacy = {
    apiKey: 'PADDLE_API_KEY',
    webhookSecret: 'PADDLE_WEBHOOK_SECRET',
    clientToken: 'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN',
  }[which];
  return env(legacy);
}

/**
 * The credentials for one mode, or null when that mode is not set up.
 *
 * All three must be present: the API key signs server calls, the webhook
 * secret is the only thing standing between this app and a forged "paid"
 * event, and the client token is what the pay page needs to open a checkout.
 * Two out of three is a half-configured integration that fails at the worst
 * moment, so it counts as absent.
 *
 * The prefixes must match the mode too. A key that fails that test is not a
 * usable credential for this mode whatever its variable is called.
 */
export function paddleCredentialsFor(mode: PaddleMode): PaddleCredentials | null {
  const apiKey = credential(mode, 'apiKey');
  const webhookSecret = credential(mode, 'webhookSecret');
  const clientToken = credential(mode, 'clientToken');
  if (!apiKey || !webhookSecret || !clientToken) return null;

  if (
    !apiKey.startsWith(PREFIXES[mode].apiKey) ||
    !clientToken.startsWith(PREFIXES[mode].clientToken)
  ) {
    return null;
  }

  return { mode, apiKey, webhookSecret, clientToken };
}

/**
 * What the admin screen needs to explain itself.
 *
 * Deliberately reports only presence and prefix — never a value, not even a
 * masked one. "Which variable is missing" is all anybody needs to fix this,
 * and a payments credential should not be recoverable from a screenshot of an
 * admin page.
 */
export type PaddleCredentialCheck = {
  /** The environment variable to set. */
  name: string;
  present: boolean;
  /** Set, but carrying the other mode's prefix — the mistake made here before. */
  wrongEnvironment: boolean;
};

export function paddleModeReadiness(mode: PaddleMode): {
  ready: boolean;
  checks: PaddleCredentialCheck[];
} {
  const expected = PREFIXES[mode];
  const checks: PaddleCredentialCheck[] = (
    [
      ['apiKey', expected.apiKey],
      ['webhookSecret', null],
      ['clientToken', expected.clientToken],
    ] as const
  ).map(([which, prefix]) => {
    const value = credential(mode, which);
    return {
      name: names(mode)[which],
      present: Boolean(value),
      // A webhook secret carries no environment marker in its prefix, so there
      // is nothing to check and nothing to claim.
      wrongEnvironment: Boolean(value && prefix && !value.startsWith(prefix)),
    };
  });

  return { ready: paddleCredentialsFor(mode) !== null, checks };
}

/**
 * Whether Paddle can actually take a payment right now, for `provider.ts`.
 *
 * Specifically the **active** mode, not "either mode". An earlier version of
 * this asked whether any mode had credentials, on the reasoning that the admin
 * toggle refuses to select a mode whose credentials are missing. That
 * reasoning was wrong, and the case it misses is the one that occurs on the way
 * to going live: the toggle guards the switch *to live*, but sandbox is the
 * default and nothing guards that. An environment holding only the `_LIVE`
 * credentials — which is exactly what Production should hold — would report
 * Paddle as configured while the active mode had nothing behind it, and
 * `startCheckout` would throw instead of saying the rail is not available.
 *
 * Async for that reason: the mode lives in the database. `activeProvider()`
 * became async with it, which is why `provider.ts` awaits its predicates.
 */
export async function paddleConfigured(): Promise<boolean> {
  return (await paddleActiveCredentials()) !== null;
}

/**
 * The mode in force, from the database, defaulting to sandbox.
 *
 * Sandbox on anything unexpected — setting absent, row unreadable, Supabase
 * unconfigured — for the reason the old `PADDLE_ENV` default had: defaulting
 * to production means a mistake takes real money, while defaulting to sandbox
 * means it takes none and somebody notices.
 *
 * Read with the admin client because this is also called from the webhook
 * route, which has no session. The value is not a secret; the policy on
 * `platform_settings` lets anon read it anyway.
 *
 * Deliberately not wrapped in React's `cache()`, unlike the query helpers in
 * `lib/queries`. This runs in the webhook route as well as in pages, and a
 * single-row lookup by primary key is cheap enough that per-request memoising
 * is not worth making the most consequential path in the app depend on a
 * render context being present.
 */
export async function paddleMode(): Promise<PaddleMode> {
  try {
    const { data, error } = await createAdminClient()
      .from('platform_settings')
      .select('value')
      .eq('key', 'paddle_live')
      .maybeSingle();

    if (error) {
      console.warn('[paddle] could not read the paddle_live setting:', error.message);
      return 'sandbox';
    }
    return data?.value === true ? 'live' : 'sandbox';
  } catch (err) {
    console.warn('[paddle] could not read the paddle_live setting:', err);
    return 'sandbox';
  }
}

/** The credentials in force, or null when the active mode is not set up. */
export async function paddleActiveCredentials(): Promise<PaddleCredentials | null> {
  const mode = await paddleMode();
  const creds = paddleCredentialsFor(mode);
  if (!creds && mode === 'live') {
    // Loud, because it means an admin switched to live and the credentials
    // went away afterwards. Checkout will refuse rather than fall back to
    // sandbox: taking a test payment from a real operator is worse than
    // telling them the page is not available.
    console.error('[paddle] mode is live but the live credentials are missing or not live keys');
  }
  return creds;
}

export function paddleEnvironmentFor(mode: PaddleMode): Environment {
  return mode === 'live' ? Environment.production : Environment.sandbox;
}

/**
 * One SDK client per API key.
 *
 * Keyed rather than a single `cached`, because the mode can now change while
 * the process lives. A lone module-level client would pin whichever mode was
 * in force at the first checkout and keep using it after the toggle moved.
 */
const clients = new Map<string, Paddle>();

function clientFor(creds: PaddleCredentials): Paddle {
  let instance = clients.get(creds.apiKey);
  if (!instance) {
    instance = new Paddle(creds.apiKey, { environment: paddleEnvironmentFor(creds.mode) });
    clients.set(creds.apiKey, instance);
  }
  return instance;
}

async function client(): Promise<Paddle> {
  const creds = await paddleActiveCredentials();
  if (!creds) throw new Error('Paddle credentials for the active mode are not set');
  return clientFor(creds);
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
 *
 * It is a yearly cycle because plans are annual (migration 042). The interval
 * here is what Paddle will renew on, so a `month` would take the annual price
 * every month — the one mistake in this file that costs an operator money
 * rather than merely failing.
 */
export async function createCheckout(req: PaddleCheckoutRequest): Promise<PaddleCheckout> {
  const currency = req.currency.toUpperCase();
  if (!isPaddleCurrency(currency)) {
    throw new Error(
      `Paddle cannot bill in ${currency}. Supported: ${PADDLE_CURRENCIES.join(', ')}`,
    );
  }

  const tx = await (await client()).transactions.create({
    items: [
      {
        quantity: 1,
        price: {
          name: req.planName,
          description: req.description,
          unitPrice: { amount: toMinorUnits(req.amount, currency), currencyCode: currency },
          billingCycle: { interval: 'year', frequency: 1 },
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
  /** Paddle's own invoice number, e.g. `148053-10002`. */
  invoiceNumber: string | null;
  subscriptionId: string | null;
  meta: Record<string, string>;
  raw: unknown;
};

/**
 * Re-reads a transaction from Paddle.
 *
 * Same rule as Flutterwave's `verifyTransaction`, and for the same reason: the
 * webhook body states its own amount, and a forged one claiming a completed
 * $200 payment would otherwise buy a plan for the cost of an HTTP request. The
 * signature proves who sent it; this proves what happened.
 *
 * The amount read back is `details.totals.grandTotal` in minor units — what the
 * customer was actually charged, tax included — converted back to major units
 * so it compares against `subscription_plans.price_yearly` on the same scale.
 */
export async function getTransaction(transactionId: string): Promise<VerifiedPaddleTransaction> {
  const tx = await (await client()).transactions.get(transactionId);

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
    // Always null in practice, and left here rather than removed because it is
    // the right field the day the API key can read it.
    //
    // `transactions.get` returns `customer_id` but not the customer unless the
    // call asks for `include=customer`, and this key is not scoped to read
    // customers — the endpoint answers 403 "not authorized to read customer"
    // (measured 9 November 2026). Adding the include would therefore not fill
    // this in; it would make every webhook throw. So anything that needs to
    // reach the buyer uses our own record of who they are, which is also the
    // more trustworthy source: see lib/payments/receipt.ts.
    customerEmail: tx.customer?.email ?? null,
    // Paddle issues the tax invoice, being Merchant of Record. The number is
    // worth carrying so our own confirmation can quote it and the operator has
    // one reference that matches Paddle's email and their accountant's copy.
    invoiceNumber: tx.invoiceNumber ?? null,
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
  if (!signature) return { ok: false, reason: 'signature' };

  // Both secrets are tried, active mode first.
  //
  // Not a weakening: both are our own endpoint secrets, and a signature still
  // has to be a real HMAC of the exact bytes under one of them. What it buys
  // is the switch itself. A mode flip is now instant, so a payment can be in
  // flight across it — the checkout opened under one mode and Paddle delivers
  // the event seconds later, by which time the other secret is active. One
  // secret would reject that delivery as forged, and since Paddle retries a
  // 401 forever, a real operator's payment would sit unprovisioned while the
  // log blamed a bad signature.
  //
  // The asymmetry of the two directions is why this is worth the lines:
  // dropping a sandbox event costs a test, dropping a live one means somebody
  // paid and got nothing.
  const active = await paddleMode();
  const order: PaddleMode[] = active === 'live' ? ['live', 'sandbox'] : ['sandbox', 'live'];

  // Each candidate brings its own SDK instance. Going through the active
  // client instead would throw when the active mode has no credentials, and a
  // 500 there is the one outcome worse than a 401: Paddle retries both, but a
  // 500 tells us nothing about which secret was wrong.
  const candidates = order
    .map((mode) => paddleCredentialsFor(mode))
    .filter((creds): creds is PaddleCredentials => creds !== null);

  if (candidates.length === 0) return { ok: false, reason: 'signature' };

  for (const creds of candidates) {
    const { mode, webhookSecret: secret } = creds;
    const sdk = clientFor(creds);

    let valid = false;
    try {
      valid = await sdk.webhooks.isSignatureValid(rawBody, secret, signature);
    } catch (err) {
      // A malformed header lands here rather than returning false. It is the
      // same for every secret, so there is nothing to gain by trying the next.
      console.warn('[paddle] could not check a webhook signature:', err);
      return { ok: false, reason: 'signature' };
    }

    if (!valid) continue;

    if (mode !== active) {
      console.warn(
        `[paddle] accepted a ${mode} webhook while the active mode is ${active}; ` +
          'this is expected only just after a mode switch.',
      );
    }

    try {
      return { ok: true, event: await sdk.webhooks.unmarshal(rawBody, secret, signature) };
    } catch (error) {
      return { ok: false, reason: 'payload', error };
    }
  }

  return { ok: false, reason: 'signature' };
}
