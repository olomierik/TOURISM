'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';

import { redirect } from 'next/navigation';
import { getPathname } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { siteUrl } from '@/lib/seo';
import { locales, type Locale } from '@/i18n/routing';
import type { SocialProvider } from '@/lib/auth/providers';

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
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: mapAuthError(error) };

  revalidatePath('/', 'layout');

  const locale = (await getLocale()) as Locale;

  // `next` arrives from the proxy already locale-prefixed — the user was going
  // somewhere specific before being asked to sign in, so honour that.
  if (next) redirect(next);

  // Otherwise land them somewhere they can actually do something. Sending
  // everyone to /account made signing in feel like it had failed: that page is a
  // form asking for more personal details, with no onward route into the
  // product, so an owner never found the dashboard and an admin never found
  // /admin. The role decides the destination.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  const landing =
    profile?.role === 'admin'
      ? '/admin'
      : profile?.role === 'business_owner'
        ? '/dashboard'
        : '/account';

  // getPathname + next/navigation's redirect rather than next-intl's redirect:
  // only the former is typed as returning `never`, which is what lets TypeScript
  // see that this function terminates.
  redirect(getPathname({ href: landing, locale }));
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
  // A relative emailRedirectTo would be rejected, and Supabase would silently
  // fall back to the project's Site URL — so never build one.
  const origin = (await headers()).get('origin') || siteUrl;

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

/**
 * Ends the session and redirects. For plain <form action={signOut}> usage.
 */
export async function signOut() {
  await clearSession();
  const locale = (await getLocale()) as Locale;
  redirect(getPathname({ href: '/', locale }));
}

/**
 * Ends the session without redirecting, so the caller controls the navigation.
 *
 * This exists because the header needs a full page load afterwards, not a
 * client-side one. The signed-in state in the header is resolved by the browser
 * Supabase client, which keeps its own copy of the session and does not learn
 * that the server cleared the cookies. Clearing the client copy as well turned
 * out to race with the server write and could leave the cookies intact — the
 * header said "Sign in" while /admin still returned 200, which is the worst of
 * both outcomes.
 *
 * A hard navigation removes the race: the server clears the cookies, then the
 * whole page is thrown away and rebuilt, so nothing client-side survives to
 * contradict it.
 */
export async function endSession(): Promise<void> {
  await clearSession();
}

async function clearSession() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
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

/**
 * Starts a Google or Apple sign-in.
 *
 * Returns the provider's authorization URL for the browser to follow rather than
 * redirecting here: a server action redirect to an external origin is awkward to
 * reason about, and handing the URL back lets the caller show a failure in place
 * if the provider is misconfigured.
 *
 * The user lands back on /auth/callback with a one-time code, which is the same
 * route email confirmation uses — OAuth and email confirmation both come back
 * through the PKCE exchange, so there is one place that turns a code into a
 * session.
 *
 * Note that `redirectTo` is subject to the project's redirect allow-list exactly
 * as emailRedirectTo is. If the allow-list does not contain this origin, Supabase
 * substitutes the project's Site URL and the user is dropped somewhere else after
 * a successful sign-in.
 */
export async function startOAuth(
  provider: SocialProvider,
  next?: string,
): Promise<{ url?: string; error?: AuthErrorKey }> {
  const locale = (await getLocale()) as Locale;
  const origin = (await headers()).get('origin') || siteUrl;

  const params = new URLSearchParams({ locale });
  const safe = safeNext(next);
  if (safe) params.set('next', safe);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?${params.toString()}`,
      // Ask Google for a refresh token and force the account chooser, so someone
      // signed into several Google accounts is not silently logged in as
      // whichever one the browser happens to prefer.
      ...(provider === 'google'
        ? { queryParams: { access_type: 'offline', prompt: 'select_account' } }
        : {}),
    },
  });

  if (error || !data.url) {
    console.error('[auth] oauth start failed', provider, error?.message);
    return { error: 'generic' };
  }

  return { url: data.url };
}
