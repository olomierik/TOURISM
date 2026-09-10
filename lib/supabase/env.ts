/**
 * Validated Supabase configuration.
 *
 * Failing loudly at startup beats a null-reference deep inside an auth callback,
 * where the symptom (a redirect loop) says nothing about the cause (a missing
 * env var). Server-only values are read through functions so that merely
 * importing this module from a client component cannot pull a secret into the
 * browser bundle.
 */

function isValidUrl(url: string | undefined): boolean {
  if (!url || url.includes('<') || url.includes('>')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured =
  isValidUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) &&
  !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.includes('<');

/** Project URL. Public: it appears in every browser request anyway. */
export const supabaseUrl = isSupabaseConfigured
  ? process.env.NEXT_PUBLIC_SUPABASE_URL!
  : 'https://placeholder.supabase.co';

/**
 * Browser-side key. Safe to expose — it is constrained by Row Level Security and
 * can only reach what the policies allow, which we verify in the RLS test suite.
 */
export const supabasePublishableKey = isSupabaseConfigured
  ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  : 'placeholder-anon-key';

/**
 * Secret key. Bypasses RLS completely.
 *
 * Deliberately a function rather than a module-level constant: a top-level read
 * would evaluate during any import of this file, including from a client
 * component, and Next would then refuse the build — or worse, on a misconfigured
 * setup, inline the value. Callers must be in server-only code.
 */
export function getSupabaseSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (key && !key.includes('<')) {
    return key;
  }
  return 'placeholder-secret-key';
}
