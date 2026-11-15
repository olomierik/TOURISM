/**
 * Shared between the batch-send server actions and the button that calls
 * them. A 'use server' file may export only async functions, so the constants
 * and types live here.
 */

/** Invitations per 24 hours. See lib/outreach/send-batch.ts for why. */
export const DAILY_CAP = Math.max(1, Number(process.env.OUTREACH_DAILY_CAP) || 90);

/** How many the browser asks the server to send per request. */
export const CHUNK_SIZE = 5;

/** The groups a batch can be sent from. Bounced and no-address never. */
export const BATCH_FILTERS = ['never', 'staged', 'failed'] as const;
export type BatchFilter = (typeof BATCH_FILTERS)[number];

export type PlanResult =
  | { error: string }
  | { ids: string[]; sentToday: number; cap: number };

export type ChunkResult = {
  sent: number;
  skipped: number;
  failed: number;
  /** Set when the run must not continue: the reason, in words. */
  stop?: string;
};
