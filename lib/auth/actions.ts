'use server';

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { getLocale } from 'next-intl/server';

import { redirect } from 'next/navigation';
import { getPathname } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { siteUrl } from '@/lib/seo';
import { locales, type Locale } from '@/i18n/routing';
import type { SocialProvider } from '@/lib/auth/providers';
import { googleDirectReady, isDirectOrigin } from '@/lib/auth/google';

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
  /** Auth or email isn't configured on this deployment, or the auth server is unreachable. */
  | 'unavailable'
  | 'generic';

export type AuthState = {
  /** i18n key under `auth.errors`, never a raw provider message. */
  error?: AuthErrorKey;
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
      // supabase-js reports an unreachable auth server as an error with no code
      // (AuthRetryableFetchError, status 0). That is an outage, not a wrong
      // password: telling the person their password is wrong sends them to reset
      // a password that was never the problem.
      if (isUnreachable(error)) {
        console.error('[auth] auth server unreachable', error.message);
        return 'unavailable';
      }
      console.error('[auth] unmapped error', error.code, error.message);
      return 'generic';
  }
}

function isUnreachable(error: { code?: string; message?: string; status?: number }): boolean {
  const message = error.message?.toLowerCase() ?? '';
  return (
    (!error.code && (error.status === undefined || error.status === 0 || error.status >= 500)) ||
    message.includes('fetch failed') ||
    message.includes('failed to fetch')
  );
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

  // Without Supabase there is nobody to check the password against. This used to
  // set a "demo_user" cookie and let anyone in — with the admin role for any email
  // containing "admin" — which is what production did for weeks after its build
  // lost the Supabase variables: every sign-in "worked", nothing was saved, and
  // /admin opened for strangers. Refuse instead, and say why.
  if (!isSupabaseConfigured) {
    console.error('[auth] sign-in refused: Supabase is not configured on this deployment');
    return { error: 'unavailable' };
  }

  const supabase = await createClient();
  let userId: string;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: mapAuthError(error) };
    if (!data?.user) return { error: 'invalidCredentials' };
    userId = data.user.id;
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string; status?: number } | undefined;
    return { error: mapAuthError({ code: e?.code, message: e?.message ?? 'fetch failed', status: e?.status }) };
  }

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
    .eq('id', userId)
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
  const next = safeNext(String(formData.get('next') ?? ''));

  const invalid = validate({ email, password, fullName }, { requireName: true });
  if (invalid) return { error: invalid };

  // Admin is never self-assignable; anything unexpected becomes a traveler.
  // The database trigger enforces this again, but rejecting it here means a
  // tampered form never even reaches the database.
  const role = roleInput === 'business_owner' ? 'business_owner' : 'traveler';

  // Without Supabase there is nowhere to create the account.
  if (!isSupabaseConfigured) {
    console.error('[auth] sign-up refused: Supabase is not configured on this deployment');
    return { error: 'unavailable' };
  }

  const locale = (await getLocale()) as Locale;

  // No email verification: the account works the moment it is created, and
  // the person is signed in straight away. Every step between "Create
  // account" and using the site loses people, and a confirmation email is the
  // step that depends on a mail server, a spam filter and switching apps.
  // Password reset still proves the address when it matters.
  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, locale },
  });

  if (error) return { error: mapAuthError(error) };
  if (!created?.user) {
    console.error('[auth] createUser returned no user for', email);
    return { error: 'generic' };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    // The account exists, so "try signing in" is the true and useful answer.
    console.error('[auth] account created but sign-in failed', email, signInError.message);
    return { error: mapAuthError(signInError) };
  }

  revalidatePath('/', 'layout');

  // Somewhere specific first (they were asked to sign up on the way to
  // something), otherwise the welcome page with the next real step.
  if (next) redirect(next);
  redirect(`${getPathname({ href: '/welcome', locale })}?new=1`);
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
  try {
    const cookieStore = await cookies();
    cookieStore.delete('demo_user');
  } catch {
    // ignore
  }
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
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
 *
 * Google, on the site itself, goes through /auth/google instead, so Google's
 * screen names this site rather than Supabase (lib/auth/google.ts).
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

  if (provider === 'google' && googleDirectReady && isDirectOrigin(origin)) {
    return { url: `${origin}/auth/google?${params.toString()}` };
  }

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
