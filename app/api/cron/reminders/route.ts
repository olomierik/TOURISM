import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

import { runReminders, type ReminderScope } from '@/lib/reminders/run';

/**
 * Runs the reminder emails (lib/reminders/run.ts). Called hourly by the
 * Netlify scheduled function netlify/functions/reminders.mjs with
 * `Authorization: Bearer <CRON_SECRET>`; anything else gets 401, and without
 * CRON_SECRET set the endpoint is off.
 *
 * Outside production, `?leads=` and `?businesses=` (comma-separated ids) limit
 * a run to test records, so a local test never stamps real people's
 * reminders as sent.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 26;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? '';
  if (secret.length < 16) return false;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function ids(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const list = value.split(',').filter((v) => /^[0-9a-f-]{36}$/i.test(v));
  return list.length ? list : undefined;
}

async function handle(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'reminders are not configured' }, { status: 503 });
  }
  if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const scope: ReminderScope = {};
  if (process.env.NODE_ENV !== 'production') {
    const sp = request.nextUrl.searchParams;
    scope.leadIds = ids(sp.get('leads'));
    scope.businessIds = ids(sp.get('businesses'));
  }

  const started = Date.now();
  const report = await runReminders(scope);
  console.log('[reminders] run', JSON.stringify(report), `${Date.now() - started}ms`);
  return NextResponse.json({ ok: true, sent: report }, { headers: { 'Cache-Control': 'no-store' } });
}

export const GET = handle;
export const POST = handle;
