import { cache } from 'react';

import { supabaseUrl, supabasePublishableKey } from '@/lib/supabase/env';

/**
 * Which social sign-in providers this project actually has switched on.
 *
 * Read from the auth server rather than from an environment variable, because
 * the two can disagree and only one of them is the truth. A button for a
 * provider that is not configured does not fail politely — it sends the user to
 * a Supabase error page — so the list of buttons is derived from the same place
 * that decides whether the flow will work.
 *
 * The practical effect is that enabling Google in the Supabase dashboard makes
 * the button appear on the next revalidation, with no deploy and nothing to keep
 * in sync.
 */

export type SocialProvider = 'google' | 'apple';

const SUPPORTED: SocialProvider[] = ['google', 'apple'];

type AuthSettings = { external?: Record<string, boolean> };

export const enabledProviders = cache(async (): Promise<SocialProvider[]> => {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabasePublishableKey },
      // Cached for an hour: this changes when someone edits the dashboard, which
      // is rare, and the login page must not make a network call per render.
      next: { revalidate: 3600, tags: ['auth-settings'] },
    });

    if (!res.ok) return [];

    const settings = (await res.json()) as AuthSettings;
    return SUPPORTED.filter((p) => settings.external?.[p] === true);
  } catch (err) {
    // A login page that renders without social buttons is degraded. One that
    // fails to render because an unrelated endpoint timed out is broken.
    console.error('[auth] could not read provider settings', err);
    return [];
  }
});
