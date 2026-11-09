import { createAdminClient } from '@/lib/supabase/admin';
import { getEmailProvider } from '@/lib/notifications';
import { renderBrandedEmail } from '@/lib/notifications/template';
import { absoluteUrl } from '@/lib/seo';

/**
 * "I paid you and heard nothing."
 *
 * Reported by Erick on 9 November 2026 after a sandbox test buy, and the
 * complaint was two separate things wearing one coat:
 *
 *   **The tax invoice is Paddle's to send, and it did its part.** Paddle is
 *   Merchant of Record, so it is the seller of record and the only party that
 *   can issue a VAT invoice. On that test it created customer
 *   `ctm_01m70npr…` and invoice `148053-10002`. The email did not reach the
 *   buyer because Paddle's **sandbox** only delivers to the account's own
 *   registered email domain, and for an account on a free provider such as
 *   Gmail *every* sandbox email goes to the account's main address with
 *   `[TEST]` in the subject. Nothing to fix; live behaves normally.
 *
 *   **Our own confirmation did not exist at all.** Neither this webhook nor
 *   Flutterwave's ever sent one. That is this file.
 *
 * The two are deliberately not merged. Duplicating Paddle's invoice would mean
 * issuing a second document for one sale, and an invoice that disagrees with
 * the Merchant of Record's is worse than no invoice. So this confirms the
 * payment, says what it bought and until when, and quotes Paddle's invoice
 * number so the operator has one reference matching both Paddle's email and
 * their accountant's copy.
 *
 * It does not link the invoice PDF. Paddle will hand one over at
 * `GET /transactions/{id}/invoice`, but the URL is a presigned S3 link that
 * expires (measured: 1703 characters, with expiry parameters), and a dead link
 * in an email somebody opens next week is worse than none.
 *
 * English and UTC, for the same reason `lib/admin/claims.ts` says: a webhook
 * has no request locale, and "9 November 2027" is unambiguous where 11/09/2027
 * is not.
 */

/**
 * Who to tell, and why it is not the address Paddle holds.
 *
 * The owner's account email first, then the listing's published address. Both
 * come from our own database, which is the right source twice over: it is the
 * person who has a dashboard to log into, and `getTransaction` cannot read
 * Paddle's customer with the key we have anyway (see the note there).
 */
async function recipientFor(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
): Promise<{ email: string; name: string | null; businessName: string } | null> {
  const { data: business } = await admin
    .from('businesses')
    .select('name, email, owner_id')
    .eq('id', businessId)
    .maybeSingle();

  if (!business) return null;

  let ownerEmail: string | null = null;
  let ownerName: string | null = null;

  if (business.owner_id) {
    const { data: owner } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', business.owner_id)
      .maybeSingle();
    ownerEmail = owner?.email ?? null;
    ownerName = owner?.full_name ?? null;
  }

  const email = ownerEmail ?? business.email;
  if (!email) return null;

  return { email, name: ownerName, businessName: business.name };
}

function longDateUTC(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(iso),
  );
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
  } catch {
    // An unknown currency code must not cost somebody their receipt.
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export type PaymentReceipt = {
  businessId: string;
  planName: string;
  amount: number;
  currency: string;
  /** End of the period this payment bought, ISO. */
  periodEnd: string;
  /** Paddle's invoice number, where there is one. */
  invoiceNumber?: string | null;
  /** Named so the mail can say who issued the invoice. */
  provider: 'paddle' | 'flutterwave';
};

/**
 * Sends the confirmation. Best-effort by contract.
 *
 * Every caller is a webhook that has already taken money and granted the plan,
 * and neither of those may be undone by a mail server having a bad minute. So
 * this never throws: it logs and returns false. A failure is a message nobody
 * received, which is recoverable by hand from the `payments` row; a throw would
 * make Paddle retry a transaction that was already provisioned.
 */
export async function sendPaymentReceipt(receipt: PaymentReceipt): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const to = await recipientFor(admin, receipt.businessId);

    if (!to) {
      console.warn(
        `[receipt] no email on record for business ${receipt.businessId}; payment confirmed but unannounced`,
      );
      return false;
    }

    const invoiceLine =
      receipt.provider === 'paddle'
        ? receipt.invoiceNumber
          ? `Your invoice number is ${receipt.invoiceNumber}. Paddle handles payment and tax for Explore Tanzania and emails the invoice itself, so look for a separate message from them with the PDF attached.`
          : 'Paddle handles payment and tax for Explore Tanzania and emails the invoice itself, so look for a separate message from them with the PDF attached.'
        : 'A receipt from our payment provider follows separately.';

    const { html, text } = renderBrandedEmail({
      heading: 'Payment received',
      paragraphs: [
        to.name ? `Hello ${to.name},` : 'Hello,',
        `We have received ${money(receipt.amount, receipt.currency)} for ${receipt.planName} on ${to.businessName}.`,
        `The plan is active now and runs until ${longDateUTC(receipt.periodEnd)}. It renews on that date unless you cancel before then.`,
        invoiceLine,
      ],
      action: { label: 'View your plan', url: absoluteUrl('/dashboard/subscription') },
      footnote: `Sent to ${to.email} because you manage ${to.businessName} on Explore Tanzania.`,
    });

    const result = await getEmailProvider().send({
      to: to.email,
      subject: `Payment received — ${receipt.planName}`,
      text,
      html,
    });

    if (!result.ok) {
      console.error(`[receipt] send failed for business ${receipt.businessId}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[receipt] could not send a payment confirmation', err);
    return false;
  }
}
