/**
 * Validated Supabase configuration.
 *
 * Failing loudly at startup beats a null-reference deep inside an auth callback,
 * where the symptom (a redirect loop) says nothing about the cause (a missing
 * env var). Server-only values are read through functions so that merely
 * importing this module from a client component cannot pull a secret into the
 * browser bundle.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env and fill it in — ` +
        'the values are in the Supabase dashboard under Settings → API.',
    );
  }
  return value;
}

/** Project URL. Public: it appears in every browser request anyway. */
export const supabaseUrl = required(
  'NEXT_PUBLIC_SUPABASE_URL',
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

/**
 * Browser-side key. Safe to expose — it is constrained by Row Level Security and
 * can only reach what the policies allow, which we verify in the RLS test suite.
 */
export const supabasePublishableKey = required(
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/**
 * Secret key. Bypasses RLS completely.
 *
 * Deliberately a function rather than a module-level constant: a top-level read
 * would evaluate during any import of this file, including from a client
 * component, and Next would then refuse the build — or worse, on a misconfigured
 * setup, inline the value. Callers must be in server-only code.
 */
export function getSupabaseSecretKey(): string {
  return required('SUPABASE_SECRET_KEY', process.env.SUPABASE_SECRET_KEY);
}
