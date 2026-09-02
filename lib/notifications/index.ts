import 'server-only';

/**
 * Notification abstraction.
 *
 * Two channels — in-app rows and transactional email — behind one interface, so
 * a flow calls `notify()` once and neither knows nor cares which providers are
 * configured. Without an email key the console provider takes over, which means
 * the entire lead pipeline is testable locally without signing up for anything.
 *
 * In-app notifications are written by the database (the lead distribution
 * function inserts them), so the email side is what this module actually drives.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  /**
   * Plain text. Always sent, even when `html` is present: a mail client that
   * blocks HTML or reads aloud still needs the message, and a mail with only an
   * HTML part scores worse with spam filters than one carrying both.
   */
  text: string;
  /** Optional HTML part, for the few mails that are worth branding. */
  html?: string;
  replyTo?: string;
};

export type EmailResult = {
  ok: boolean;
  provider: string;
  id?: string;
  error?: string;
};

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailResult>;
}

/**
 * Development provider. Logs and reports success.
 *
 * Returns ok:true on purpose: a missing email key is a configuration state, not
 * a failure, and a lead must never be rejected because the mailer is not set up.
 */
class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';

  async send(message: EmailMessage): Promise<EmailResult> {
    console.info(
      `[email:console] to=${message.to} subject="${message.subject}"\n${message.text}\n`,
    );
    return { ok: true, provider: this.name, id: `console-${Date.now()}` };
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`[email:resend] ${res.status} ${body.slice(0, 300)}`);
        return { ok: false, provider: this.name, error: `HTTP ${res.status}` };
      }

      const data = (await res.json()) as { id?: string };
      return { ok: true, provider: this.name, id: data.id };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'unknown';
      console.error(`[email:resend] ${error}`);
      return { ok: false, provider: this.name, error };
    }
  }
}

let cached: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cached) return cached;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  cached =
    apiKey && from
      ? new ResendEmailProvider(apiKey, from)
      : new ConsoleEmailProvider();

  return cached;
}
