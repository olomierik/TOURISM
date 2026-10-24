import { NextResponse } from 'next/server';

import { supabaseUrl, supabasePublishableKey, isSupabaseConfigured } from '@/lib/supabase/env';

/**
 * Health check for uptime monitors (UptimeRobot, Better Stack, Netlify).
 *
 * 200 when the database and sign-in answer from the deployed site, 503 when
 * either does not, so a monitor pointed here alerts on the failure that took
 * sign-up down before (production quietly disconnected from Supabase). Email
 * is reported as configured or not, without calling Resend. Nothing secret is
 * returned.
 */
export const dynamic = 'force-dynamic';

async function check(url: string): Promise<'ok' | 'down'> {
  try {
    const res = await fetch(url, {
      headers: { apikey: supabasePublishableKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    return res.ok ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}

export async function GET() {
  const [database, auth] = isSupabaseConfigured
    ? await Promise.all([
        check(`${supabaseUrl}/rest/v1/destinations?select=id&limit=1`),
        check(`${supabaseUrl}/auth/v1/settings`),
      ])
    : (['down', 'down'] as const);

  const healthy = database === 'ok' && auth === 'ok';
  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks: {
        database,
        auth,
        email: process.env.RESEND_API_KEY ? 'configured' : 'not configured',
      },
      commit: (process.env.COMMIT_REF ?? '').slice(0, 7) || null,
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
