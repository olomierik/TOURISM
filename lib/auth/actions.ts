'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';

import { redirect } from 'next/navigation';
import { getPathname } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { locales, type Locale } from '@/i18n/routing';

/**
 * Keys under `auth.errors`. A union rather than `string` so a typo becomes a
 * build error instead of a missing-translation warning at runtime.
 */
export type AuthErrorKey =
  | 'invalidCredentials'
  | 'emailInUse'
  | 'weakPassword'
  | 'nameRequired'
  | 'emailRequired'
  | 'emailInvalid'
  | 'passwordRequired'
  | 'rateLimited'
  | 'generic';

export type AuthState = {
  /** i18n key under `auth.errors`, never a raw provider message. */
  error?: AuthErrorKey;
  /** Set when signup succeeds but the address still needs confirming. */
  pendingEmail?: string;
  success?: boolean;
};

/**
 * Maps a Supabase auth error to a message key.
 *
 * Provider errors are never surfaced verbatim: they leak implementation detail,
 * are untranslated, and occasionally reveal whether an address is registered.
 * Anything unrecognised falls back to a generic message and is logged server-side.
 */
function mapAuthError(error: { code?: string; message: string; status?: number }): AuthErrorKey {
  switch (error.code) {
    case 'invalid_credentials':
    case 'invalid_grant':
      return 'invalidCredentials';
    case 'user_already_exists':
    case 'email_exists':
      return 'emailInUse';
    case 'weak_password':
      return 'weakPassword';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'rateLimited';
    default:
      console.error('[auth] unmapped error', error.code, error.message);
      return 'generic';
  }
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validate(
  fields: { email?: string; password?: string; fullName?: string },
  opts: { requireName?: boolean } = {},
): AuthErrorKey | null {
  if (opts.requireName && !fields.fullName?.trim()) return 'nameRequired';
  if (!fields.email?.trim()) return 'emailRequired';
  if (!EMAIL_RE.test(fields.email.trim())) return 'emailInvalid';
  if (!fields.password) return 'passwordRequired';
  // Matches the Supabase project minimum; checked here so the user is told
  // before a round-trip rather than after.
  if (opts.requireName && fields.password.length < 8) return 'weakPassword';
  return null;
}

/** Only allow same-origin relative paths as a post-login destination. */
function safeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(String(formData.get('next') ?? ''));

  const invalid = validate({ email, password });
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: mapAuthError(error) };

  revalidatePath('/', 'layout');

  const locale = (await getLocale()) as Locale;
  // `next` arrives from the proxy already locale-prefixed; otherwise resolve the
  // localized path for /account. getPathname + next/navigation's redirect is used
  // rather than next-intl's redirect because only the former is typed as
  // returning `never`, which is what lets TypeScript see this function terminates.
  redirect(next ?? getPathname({ href: '/account', locale }));
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('fullName') ?? '').trim();
  const roleInput = String(formData.get('role') ?? 'traveler');

  const invalid = validate({ email, password, fullName }, { requireName: true });
  if (invalid) return { error: invalid };

  // Admin is never self-assignable; anything unexpected becomes a traveler.
  // The database trigger enforces this again, but rejecting it here means a
  // tampered form never even reaches the database.
  const role = roleInput === 'business_owner' ? 'business_owner' : 'traveler';

  const locale = (await getLocale()) as Locale;
  const origin = (await headers()).get('origin') ?? '';

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role, locale },
      emailRedirectTo: `${origin}/auth/callback?locale=${locale}`,
    },
  });

  if (error) return { error: mapAuthError(error) };

  return { pendingEmail: email };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  const locale = (await getLocale()) as Locale;
  redirect(getPathname({ href: '/', locale }));
}

export async function updateProfile(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'generic' };

  const localeInput = String(formData.get('locale') ?? 'en');
  const nextLocale = locales.includes(localeInput as Locale) ? localeInput : 'en';

  // No role field here by design — RLS plus the profiles_guard_role trigger
  // would reject it anyway, but omitting it keeps the intent obvious.
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: String(formData.get('fullName') ?? '').trim() || null,
      phone: String(formData.get('phone') ?? '').trim() || null,
      whatsapp: String(formData.get('whatsapp') ?? '').trim() || null,
      locale: nextLocale,
      marketing_opt_in: formData.get('marketingOptIn') === 'on',
    })
    .eq('id', user.id);

  if (error) {
    console.error('[profile] update failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
