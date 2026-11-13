import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getEmailProvider } from '@/lib/notifications';
import { isSupabaseConfigured } from '@/lib/supabase/env';

/**
 * Tells the site's admins when the server throws.
 *
 * The site had no error tracking at all: a page that crashed for every
 * visitor was visible only in the host's log, to somebody who went looking.
 * This is the smallest thing that closes that gap with what is already here —
 * the mailer and the admins' own addresses — so it needs no account, no key
 * and no new dependency. Set ALERT_EMAIL to send somewhere else.
 *
 * It is deliberately quiet. One mail per distinct error per six hours, and at
 * most five mails an hour in total, per server instance: a crash on a busy
 * page must not become a thousand emails and a suspended sending domain. The
 * limits are in memory, so a restart resets them, which is the right way to
 * be wrong.
 *
 * It never throws. An error reporter that fails must not turn one failure
 * into two.
 */

const PER_ERROR_MS = 6 * 60 * 60 * 1000;
const HOURLY_CAP = 5;

const lastSent = new Map<string, number>();
let hourStart = 0;
let sentThisHour = 0;

export type ServerErrorReport = {
  message: string;
  digest?: string;
  stack?: string;
  path?: string;
  method?: string;
  routePath?: string;
  routeType?: string;
};

/** Noise, not faults: a 404, a redirect, a client that went away. */
function ignorable(r: ServerErrorReport): boolean {
  return (
    /NEXT_NOT_FOUND|NEXT_REDIRECT|NEXT_HTTP_ERROR_FALLBACK/.test(`${r.digest ?? ''} ${r.message}`) ||
    /aborted|ECONNRESET|socket hang up/i.test(r.message)
  );
}

async function recipients(): Promise<string[]> {
  const explicit = process.env.ALERT_EMAIL?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (explicit?.length) return explicit;
  if (!isSupabaseConfigured) return [];
  const { data } = await createAdminClient()
    .from('profiles')
    .select('email')
    .eq('role', 'admin')
    .is('deleted_at', null);
  return (data ?? []).map((a) => a.email).filter((v): v is string => Boolean(v));
}

export async function reportServerError(report: ServerErrorReport): Promise<void> {
  try {
    // Always in the log, in one greppable line, whatever happens next.
    console.error(
      `[server-error] ${report.method ?? ''} ${report.path ?? ''} (${report.routePath ?? '?'}) ` +
        `${report.digest ?? ''} ${report.message}`,
    );

    if (process.env.NODE_ENV !== 'production' || ignorable(report)) return;

    const now = Date.now();
    const key = `${report.routePath ?? report.path ?? ''}|${report.message.slice(0, 200)}`;
    if (now - (lastSent.get(key) ?? 0) < PER_ERROR_MS) return;
    if (now - hourStart > 60 * 60 * 1000) {
      hourStart = now;
      sentThisHour = 0;
    }
    if (sentThisHour >= HOURLY_CAP) return;
    // The map must not grow for the life of the process.
    if (lastSent.size > 500) lastSent.clear();
    lastSent.set(key, now);
    sentThisHour += 1;

    const to = await recipients();
    if (!to.length) return;

    const provider = getEmailProvider();
    const text = [
      'The site threw an error while serving a request.',
      '',
      `Page: ${report.method ?? 'GET'} ${report.path ?? '(unknown)'}`,
      `Route: ${report.routePath ?? '(unknown)'} (${report.routeType ?? '?'})`,
      `Error: ${report.message}`,
      ...(report.digest ? [`Digest: ${report.digest}`] : []),
      '',
      ...(report.stack ? [report.stack.split('\n').slice(0, 12).join('\n'), ''] : []),
      'You will not be emailed about this same error again for six hours.',
    ].join('\n');

    await Promise.all(
      to.map((address) =>
        provider.send({
          to: address,
          subject: `Site error: ${report.message.slice(0, 80)}`,
          text,
        }),
      ),
    );
  } catch (err) {
    console.error('[server-error] reporting failed', err);
  }
}
