/**
 * Shows enough of an address to recognise, not enough to learn.
 *
 * The claimant needs to know which mailbox to open. Someone probing a listing
 * they have no connection to should not come away with a harvestable address —
 * these came from a public register, but a directory that prints them on demand
 * is a directory that gets scraped for them.
 */
export function maskEmail(email: string): string {
  const [user = '', domain = ''] = email.split('@');
  const head = user.slice(0, 1);
  const tail = user.length > 2 ? user.slice(-1) : '';
  return `${head}${'*'.repeat(Math.max(3, user.length - 2))}${tail}@${domain}`;
}
