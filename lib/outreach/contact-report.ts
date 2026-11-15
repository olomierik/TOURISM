// Relative imports with extensions: the staging script imports this as plain node.
import { CLAIM_INVITE_DAYS } from '../claims/invite-token.ts';

/**
 * The follow-up that tells an unclaimed operator what their listing did.
 *
 * Written under the same rules as the first message (lib/outreach/message.ts),
 * one of which it can now relax for a reason. That message says "do not
 * promise traffic" because there was none. There is now, and it can be stated
 * per operator: N people opened WhatsApp to them from their listing.
 *
 * What it must not do is overstate that number.
 *
 *   - It counts taps, not messages. A tap opens WhatsApp with a message
 *     written for the traveller; whether they pressed send is visible only to
 *     the operator. So the email says so, and tells them how to check: the
 *     pre-written message names Explore Tanzania in every language the site
 *     offers, so searching their WhatsApp for it finds every one that arrived.
 *     An operator who checks and finds the number true trusts the rest.
 *   - The count is distinct visitors (visitor_hash), so "different people" is
 *     exact, and "travellers" is not claimed: some will be browsing.
 *   - It starts no earlier than CONTACT_CLICKS_TRUSTED_FROM. Rows before it are
 *     mostly bots, and `days` is the span really covered, not a nominal 30.
 *   - It promises nothing about the future.
 *
 * Removal stays above the fold, as in the first message, and the sender gives
 * every copy its own single-use claim link.
 */

export type ContactReportInput = {
  businessName: string;
  contacts: number;
  /** Days the count covers. */
  days: number;
  claimUrl: string;
  /** When the first message went, so this one can refer to it plainly. */
  introducedOn: string | null;
  instantVerify: boolean;
  removalEmail: string;
  unsubscribeUrl?: string;
};

export function contactReportSubject(businessName: string, contacts: number): string {
  return contacts === 1
    ? `1 person opened WhatsApp to ${businessName} from Explore Tanzania`
    : `${contacts} people opened WhatsApp to ${businessName} from Explore Tanzania`;
}

export function contactReportBody(input: ContactReportInput): string {
  const { businessName, contacts, days, claimUrl, introducedOn, instantVerify, removalEmail, unsubscribeUrl } = input;

  const people = contacts === 1 ? '1 person' : `${contacts} different people`;
  const intro = introducedOn
    ? `We wrote to you on ${introducedOn} to say that ${businessName} is listed on Explore Tanzania, a directory of East African tour operators. This is a short update with a number in it.`
    : `${businessName} is listed on Explore Tanzania, a directory of East African tour operators. This is a short update with a number in it.`;

  const afterwards = instantVerify
    ? `After that, signing in with any address at your own domain does the same.`
    : `After that, we can confirm it by sending a short code to this address instead.`;

  return [
    `Hello,`,
    ``,
    intro,
    ``,
    `In the last ${days} days, ${people} tapped the WhatsApp button on your listing, which opens a chat to your number. The first message is written for them and names Explore Tanzania, so if you search your WhatsApp for "Explore Tanzania" you will find the ones that were sent. We can only see that WhatsApp was opened, not whether they pressed send, so your WhatsApp is the true count.`,
    ``,
    `Your listing still shows only what we found in public records. If you claim it, which is free, you can add your photos, prices and the tours you run, see this number yourself on your dashboard, and receive the trip requests travellers send through the site:`,
    ``,
    `  ${claimUrl}`,
    ``,
    `The link above was made for this address only. It works once, for ${CLAIM_INVITE_DAYS} days: open it, sign in or create an account, and the listing is yours, with no code to type. ${afterwards}`,
    ``,
    `If you would rather not be listed, reply "remove" and we will delete the listing and not write again.`,
    ``,
    `Questions: ${removalEmail}`,
    ...(unsubscribeUrl ? [``, `Stop these emails in one click: ${unsubscribeUrl}`] : []),
    ``,
    `— Explore Tanzania`,
    `https://www.exploretanzania.online`,
  ].join('\n');
}
