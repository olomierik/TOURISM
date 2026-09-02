import 'server-only';

import { absoluteUrl } from '@/lib/seo';

/**
 * The house style for transactional mail.
 *
 * Written as inline-styled tables rather than anything modern, because mail
 * clients are not browsers. Outlook renders with Word's HTML engine, Gmail
 * strips <style> blocks and external stylesheets, and flexbox and grid are
 * unavailable across most of the field. A table with inline styles is the one
 * layout that survives all of them.
 *
 * Two rules shape everything below.
 *
 * Images are blocked by default in Outlook, in Gmail for unknown senders, and
 * on most corporate mail. So the logo is never the only thing carrying the
 * brand: the wordmark beside it is live text in the brand colours, and the mail
 * reads correctly with every image suppressed. A header that is one <img> is a
 * header most recipients see as an empty box.
 *
 * And every mail has a text part. It is not a fallback nobody sees — it is what
 * screen readers, watches, and spam filters actually read, and a message with
 * only an HTML part scores worse for delivery than one carrying both.
 */

const BLUE = '#0B3D91';
const GREEN = '#009E60';
const GOLD = '#FFC107';
const INK = '#172033';
const MUTED = '#5A6473';
const PAPER = '#F7F9FC';

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type BrandedEmail = {
  /** Shown large at the top of the message body. */
  heading: string;
  /** One or more paragraphs, in order. Plain text; escaped for the HTML part. */
  paragraphs: string[];
  /** The single thing the reader is meant to do. */
  action?: { label: string; url: string };
  /** Small print under the action — an expiry note, or who it was sent to. */
  footnote?: string;
};

/**
 * Renders one message into both parts.
 *
 * Returns text as well as html so a caller cannot accidentally send a
 * brand-heavy mail with no readable alternative.
 */
export function renderBrandedEmail(mail: BrandedEmail): { html: string; text: string } {
  const logo = absoluteUrl('/logo-email.png');

  const paragraphs = mail.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font:400 16px/1.6 ${FONT};color:${INK};">${escapeHtml(p)}</p>`,
    )
    .join('');

  // Gold with dark text, which is the site's own call-to-action and the only
  // pairing in the palette that passes contrast on a coloured button.
  const action = mail.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
         <tr><td style="border-radius:10px;background:${GOLD};">
           <a href="${escapeHtml(mail.action.url)}"
              style="display:inline-block;padding:14px 28px;font:600 16px/1 ${FONT};
                     color:${INK};text-decoration:none;border-radius:10px;">
             ${escapeHtml(mail.action.label)}
           </a>
         </td></tr>
       </table>`
    : '';

  // The same link in full, because a button is unclickable in a plain-text
  // reader and untrustworthy in a client that hides where it goes.
  const rawLink = mail.action
    ? `<p style="margin:16px 0 0;font:400 13px/1.6 ${FONT};color:${MUTED};word-break:break-all;">
         ${escapeHtml(mail.action.url)}
       </p>`
    : '';

  const footnote = mail.footnote
    ? `<p style="margin:20px 0 0;font:400 13px/1.6 ${FONT};color:${MUTED};">${escapeHtml(
        mail.footnote,
      )}</p>`
    : '';

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(mail.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
  <!-- Preheader: the line a client shows beside the subject in the inbox list.
       Hidden in the body itself, or it appears twice. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(
    mail.paragraphs[0] ?? '',
  )}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:${PAPER};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:560px;background:#ffffff;border-radius:16px;
                    border:1px solid #E3E8F0;overflow:hidden;">

        <!-- Header. The wordmark is live text, so this still reads as us with
             every image blocked. -->
        <tr><td style="padding:28px 32px 4px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right:10px;vertical-align:middle;">
                <img src="${logo}" width="32" height="32" alt=""
                     style="display:block;border:0;width:32px;height:32px;">
              </td>
              <td style="vertical-align:middle;font:700 19px/1 ${FONT};letter-spacing:-0.2px;">
                <span style="color:${BLUE};">Explore</span><span style="color:${GREEN};">Tanzania</span><span style="color:${MUTED};font-weight:400;font-size:13px;">.online</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:20px 32px 32px;">
          <h1 style="margin:0 0 16px;font:700 24px/1.3 ${FONT};color:${INK};">${escapeHtml(
            mail.heading,
          )}</h1>
          ${paragraphs}
          ${action}
          ${rawLink}
          ${footnote}
        </td></tr>

        <tr><td style="padding:20px 32px;background:${PAPER};border-top:1px solid #E3E8F0;">
          <p style="margin:0;font:400 13px/1.6 ${FONT};color:${MUTED};">
            Explore Tanzania — safaris, beaches and the roof of Africa.<br>
            <a href="${escapeHtml(absoluteUrl('/'))}" style="color:${BLUE};">exploretanzania.online</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    mail.heading,
    '',
    ...mail.paragraphs,
    ...(mail.action ? ['', `${mail.action.label}: ${mail.action.url}`] : []),
    ...(mail.footnote ? ['', mail.footnote] : []),
    '',
    '—',
    'Explore Tanzania',
    absoluteUrl('/'),
  ].join('\n');

  return { html, text };
}
