import 'server-only';

import { createClient } from '@/lib/supabase/server';

/**
 * Re-checks the caller's role server-side. A server action is a public
 * endpoint with a hard-to-guess name; the admin layout is a rendering decision.
 */
export async function requireOutreachAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return profile?.role === 'admin' ? user : null;
}
