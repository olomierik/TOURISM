/**
 * The message that tells an operator their listing exists.
 *
 * This is the highest-risk text on the site. 400+ real businesses will read it,
 * many of them members of associations that circulate warnings about exactly
 * this kind of email, and the difference between "a directory listed us and told
 * us plainly" and "a directory scraped us and pretended we signed up" is entirely
 * in the wording.
 *
 * Four rules, all of which cost conversions and are worth it:
 *
 *  1. Say where the data came from, in the first two sentences, naming the
 *     actual register. Anyone who has to ask has already decided what we are.
 *  2. Never imply endorsement, membership, partnership or a rating.
 *  3. Put removal above the claim link, not in a footer. A removal offer buried
 *     under a call to action is a dark pattern wearing a compliance hat.
 *  4. Do not promise traffic. There have been 24 page views and zero leads. An
 *     email promising exposure we cannot deliver is the one that gets forwarded
 *     to TATO with a comment attached.
 *
 * English throughout: KATO's and the UTB's registers are published in English,
 * these addresses were given to those regulators in English, and business
 * correspondence across all four countries is conducted in it. Guessing at
 * Swahili or Kinyarwanda for a first contact would read as automation, which is
 * the impression this message most needs to avoid.
 */

export type OutreachInput = {
  businessName: string;
  claimUrl: string;
  /** How the listing got here, in words an operator would recognise. */
  provenance: string;
  /** The listing's published address sits on its own domain, so the fast route is open. */
  instantVerify: boolean;
  /** ISO country of the listing. The brand says Tanzania; three quarters of the listings are not. */
  countryCode: string | null;
  contactEmail: string;
  removalEmail: string;
  /** One-click removal. The header version of the same promise. */
  unsubscribeUrl?: string;
};

/** Where a listing came from, said plainly enough to be checked. */
export function provenanceFor(source: string | null | undefined): string {
  switch (source) {
    case 'kato':
      return 'the public members directory of the Kenya Association of Tour Operators';
    case 'utb':
      return 'the Uganda Tourism Board’s public register of licensed operators';
    case 'gmaps':
      return 'your public Google Maps business listing';
    default:
      return 'public tourism licensing records';
  }
}

export function subjectFor(businessName: string): string {
  // No urgency, no "action required", no first-name familiarity. Those are the
  // markers of the genre this message needs to not belong to.
  return `${businessName} is listed on Explore Tanzania — claim or remove it`;
}

export function bodyFor(input: OutreachInput): string {
  const { businessName, claimUrl, provenance, instantVerify, removalEmail, countryCode,
    unsubscribeUrl } = input;

  // Stated as a condition, not a promise. The fast route fires when the address
  // signing in is on the listing's domain — which is this address, if they use
  // it. Someone who signs up with a personal Gmail instead would otherwise have
  // been promised something that then does not happen.
  const verifyLine = instantVerify
    ? `If you sign in using this address, or any address at your own domain, the listing is confirmed as yours immediately — no code, no waiting.`
    : `We will confirm it by sending a short code to this address, so there is nothing for you to prove by hand.`;

  // The name is a fair question when we are writing to Nairobi or Kigali, and
  // it is better answered before it is asked than defended afterwards.
  const nameAside =
    countryCode && countryCode !== 'TZ'
      ? ` The name is historical — we started in Tanzania and now cover Kenya, Uganda and Rwanda as well.`
      : ``;

  return [
    `Hello,`,
    ``,
    `We have listed ${businessName} on Explore Tanzania, a directory of East African tour operators, lodges and guides.${nameAside} We built the listing from ${provenance}. You did not sign up for it and we are not claiming any connection to you — we are writing because it seems wrong to list a business without telling it.`,
    ``,
    `If you would rather not be listed, reply to this message with "remove" and we will delete the listing. No reason needed, nothing to fill in, and we will not write to you again.`,
    ``,
    `If you would like it, you can take control of the listing here:`,
    ``,
    `  ${claimUrl}`,
    ``,
    `${verifyLine} Once it is yours, you can correct anything we got wrong, add photographs and set which destinations you cover. It is free, and it stays free.`,
    ``,
    `Being straight with you about where this stands: the site is new. Traffic is small and we have not sent anyone an enquiry yet. We are not promising you bookings — we are telling you a listing exists and giving you the choice of what happens to it.`,
    ``,
    `Questions or corrections: ${removalEmail}`,
    // A link as well as the reply, because a mail client can see a link. The
    // reply stays first in the message: it is the option that reaches a person,
    // and it is what somebody who wants the listing gone entirely should use.
    ...(unsubscribeUrl
      ? [``, `Or remove yourself in one click: ${unsubscribeUrl}`]
      : []),
    ``,
    `— Explore Tanzania`,
    `https://www.exploretanzania.online`,
  ].join('\n');
}
