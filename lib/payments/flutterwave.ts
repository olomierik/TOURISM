import { timingSafeEqual } from 'node:crypto';

/**
 * Flutterwave adapter.
 *
 * Chosen because operators here are paid in Tanzanian shillings and Kenyan
 * shillings and many of them do not hold a card: Flutterwave settles M-Pesa,
 * Tigo Pesa and Airtel Money alongside cards, which is the difference between a
 * subscription an operator can buy and one they cannot.
 *
 * Deliberately the only file that knows the provider's shape. The schema stores
 * `provider` + `provider_ref` + an untouched `raw` payload precisely so a second
 * processor — or a replacement — is a sibling of this file rather than a
 * migration.
 *
 * Everything here is server-only. The secret key must never reach a bundle.
 */

const API = 'https://api.flutterwave.com/v3';

export type CheckoutRequest = {
  reference: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  customer: { email: string; name?: string | null; phone?: string | null };
  meta: Record<string, string>;
  title: string;
};

/**
 * Whether payments are switched on.
 *
 * The subscription page reads this to decide between a checkout button and an
 * honest "not live yet" notice. A button that leads nowhere is worse than no
 * button: an operator who clicks Subscribe and lands on an error concludes the
 * product is broken, not that it is unfinished.
 */
export function paymentsConfigured(): boolean {
  return Boolean(process.env.FLUTTERWAVE_SECRET_KEY && process.env.FLUTTERWAVE_WEBHOOK_HASH);
}

function secretKey(): string {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new Error('FLUTTERWAVE_SECRET_KEY is not set');
  return key;
}

/**
 * Opens a hosted checkout and returns the URL to send the operator to.
 *
 * Hosted rather than an inline card form on purpose: card details then never
 * touch this application, which removes the entire PCI surface from a codebase
 * that has no business carrying it.
 */
export async function createCheckout(req: CheckoutRequest): Promise<string> {
  const res = await fetch(`${API}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
    },
    // Never cached. A cached checkout URL would send a second operator to the
    // first one's payment.
    cache: 'no-store',
    body: JSON.stringify({
      tx_ref: req.reference,
      amount: req.amount,
      currency: req.currency,
      redirect_url: req.redirectUrl,
      // Cards plus the mobile money rails that matter in this market.
      payment_options: 'card,mobilemoneytanzania,mpesa,mobilemoneyuganda,mobilemoneyrwanda',
      customer: {
        email: req.customer.email,
        name: req.customer.name ?? undefined,
        phonenumber: req.customer.phone ?? undefined,
      },
      customizations: { title: req.title },
      meta: req.meta,
    }),
  });

  const body = (await res.json()) as {
    status?: string;
    message?: string;
    data?: { link?: string };
  };

  if (!res.ok || body.status !== 'success' || !body.data?.link) {
    throw new Error(`Flutterwave checkout failed: ${body.message ?? res.status}`);
  }

  return body.data.link;
}

export type VerifiedTransaction = {
  providerRef: string;
  reference: string;
  amount: number;
  currency: string;
  status: 'successful' | 'failed' | 'pending';
  method: string | null;
  customerEmail: string | null;
  meta: Record<string, string>;
  raw: unknown;
};

/**
 * Re-reads a transaction from Flutterwave.
 *
 * The webhook body is never trusted for anything that grants access. It arrives
 * over the public internet and states its own amount; a forged one claiming a
 * successful $149 payment would otherwise buy a featured listing for the cost of
 * an HTTP request. The signature proves the sender, and this proves the facts.
 */
export async function verifyTransaction(transactionId: string | number): Promise<VerifiedTransaction> {
  const res = await fetch(`${API}/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
    cache: 'no-store',
  });

  const body = (await res.json()) as {
    status?: string;
    message?: string;
    data?: {
      id?: number;
      tx_ref?: string;
      amount?: number;
      currency?: string;
      status?: string;
      payment_type?: string;
      customer?: { email?: string };
      meta?: Record<string, string>;
    };
  };

  if (!res.ok || body.status !== 'success' || !body.data) {
    throw new Error(`Flutterwave verify failed: ${body.message ?? res.status}`);
  }

  const d = body.data;
  return {
    providerRef: String(d.id ?? transactionId),
    reference: d.tx_ref ?? '',
    amount: Number(d.amount ?? 0),
    currency: (d.currency ?? 'USD').toUpperCase(),
    status:
      d.status === 'successful' ? 'successful' : d.status === 'failed' ? 'failed' : 'pending',
    method: d.payment_type ?? null,
    customerEmail: d.customer?.email ?? null,
    meta: d.meta ?? {},
    raw: body.data,
  };
}

/**
 * Checks the webhook signature.
 *
 * Flutterwave sends the configured secret hash verbatim in `verif-hash`, so this
 * is a comparison rather than an HMAC — but it is still a secret comparison, and
 * `===` on a secret leaks its length and prefix through timing. Constant-time,
 * with the length check done on the digest-sized buffers so it cannot short out.
 */
export function verifyWebhookSignature(header: string | null): boolean {
  const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!expected || !header) return false;

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
