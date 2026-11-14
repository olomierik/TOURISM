'use client';

import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  Mail,
  Map,
  PawPrint,
  Shield,
  User,
} from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { useSessionUser } from '@/components/auth/use-session-user';
import { endSession } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Ends the session, then reloads the page from scratch.
 *
 * The server clears the httpOnly cookies; the hard navigation throws away every
 * piece of client state that could disagree with that, including the browser
 * Supabase client's in-memory session which is what the header reads.
 *
 * Calling the browser client's own signOut() instead raced with the server
 * write and could leave the cookies valid — the header showed "Sign in" while
 * /admin still returned 200. A full page load has no such race: there is only
 * one source of truth left, and it is the cookie jar.
 */
async function endSessionAndReload() {
  await endSession();
  // A hard navigation is the whole point, so the lint rule is wrong here:
  // router.push() is a client-side navigation and would preserve exactly the
  // state this needs to discard.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign('/');
}

type Role = 'traveler' | 'business_owner' | 'admin';
type Viewer = { email: string; name: string | null; role: Role };

/**
 * Resolves the signed-in user and their role in the browser.
 *
 * `undefined` means "not resolved yet", `null` means signed out. Callers must
 * distinguish the two: rendering the signed-out state while still loading makes
 * a signed-in user see "Sign in" flash before their own name.
 *
 * This runs on the client rather than being passed down from the layout, and
 * that is a deliberate trade. Reading the session server-side means calling
 * cookies() in the root layout, which opts EVERY page underneath into dynamic
 * rendering — including the destination, directory and guide pages that exist to
 * be statically generated and crawled. A brief placeholder in the header is a
 * good trade for a statically rendered site whose growth channel is search.
 */
export function useViewer(): Viewer | null | undefined {
  // The session itself — including the re-resolve on navigation that a
  // server-action sign-in needs — lives in useSessionUser, because the listing
  // and wildlife pages now need the same answer and two copies of session
  // handling is one copy too many. All this adds is the profile row.
  const user = useSessionUser();
  const userId = user?.id ?? null;
  const email = user?.email ?? null;

  // Keyed by the account it was fetched for. Deriving the answer during render
  // rather than storing it means signing out never shows the previous reader's
  // name, and the effect never calls setState synchronously to clear it.
  const [profile, setProfile] = useState<{ id: string; name: string | null; role: Role } | null>(
    null,
  );

  useEffect(() => {
    if (!userId) return;

    let active = true;
    // RLS lets a signed-in user read exactly their own profile row.
    createClient()
      .from('profiles')
      .select('full_name, role')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!active) return;
        setProfile({
          id: userId,
          name: data?.full_name ?? null,
          role: (data?.role as Role) ?? 'traveler',
        });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  if (user === undefined) return undefined;
  if (user === null || !email) return null;
  // Signed in, profile row still loading. Reporting null here would flash
  // "Sign in" at somebody who is signed in, which is the bug this hook exists
  // to avoid, so it stays unresolved until the row lands.
  if (profile?.id !== userId) return undefined;
  return { email, name: profile.name, role: profile.role };
}

/** Header identity control: sign-in link when signed out, account menu when in. */
// The `floating` prop is gone with the header's transparent-over-photo
// variant: there is no light-text context left for it to serve.
export function UserMenu() {
  const t = useTranslations('nav');
  const tRole = useTranslations('auth.account');
  const viewer = useViewer();
  const [pending, startTransition] = useTransition();

  // Undefined means "not resolved yet". Reserve the space rather than rendering
  // the signed-out state, so a signed-in user never sees "Sign in" flash first.
  if (viewer === undefined) {
    return <div className="h-8 w-20" aria-hidden />;
  }

  if (viewer === null) {
    return (
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link href="/login">
          <LogIn className="size-4" aria-hidden />
          {t('login')}
        </Link>
      </Button>
    );
  }

  const roleLabel = {
    traveler: tRole('roleTraveler'),
    business_owner: tRole('roleBusinessOwner'),
    admin: tRole('roleAdmin'),
  }[viewer.role];

  const initial = (viewer.name ?? viewer.email).trim().charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-2"
          aria-label={t('accountMenu')}
        >
          <span
            className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            aria-hidden
          >
            {initial}
          </span>
          <span className="hidden max-w-28 truncate lg:inline">
            {viewer.name ?? viewer.email}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-56">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{viewer.name ?? viewer.email}</p>
          <p className="truncate text-xs text-muted-foreground">{viewer.email}</p>
          <p className="mt-1 text-xs font-medium text-primary">{roleLabel}</p>
        </div>
        <DropdownMenuSeparator />

        {viewer.role === 'admin' && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield className="size-4" aria-hidden />
              {t('adminArea')}
            </Link>
          </DropdownMenuItem>
        )}

        {(viewer.role === 'business_owner' || viewer.role === 'admin') && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="size-4" aria-hidden />
              {t('dashboard')}
            </Link>
          </DropdownMenuItem>
        )}

        {viewer.role === 'traveler' && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/account/favorites">
                <Heart className="size-4" aria-hidden />
                {t('saved')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/trips">
                <Map className="size-4" aria-hidden />
                {t('savedTrips')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/sightings">
                <PawPrint className="size-4" aria-hidden />
                {t('safariDiary')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/enquiries">
                <Mail className="size-4" aria-hidden />
                {t('myEnquiries')}
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuItem asChild>
          <Link href="/account">
            <User className="size-4" aria-hidden />
            {t('myAccount')}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          // Calls the action directly rather than submitting a nested form.
          // A <form> inside a menu item cannot work here: Radix closes the menu
          // on select, which unmounts the form mid-submit and the browser
          // cancels it — "Form submission canceled because the form is not
          // connected". The click looked like it worked and the user stayed
          // signed in.
          onSelect={() => startTransition(() => void endSessionAndReload())}
          disabled={pending}
        >
          <LogOut className="size-4" aria-hidden />
          {pending ? t('signingOut') : t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The same destinations as the desktop menu, rendered flat for the mobile sheet.
 *
 * A dropdown inside an already-open mobile sheet is a poor pattern — two nested
 * dismissible layers on a small screen — so the links are listed directly.
 */
export function MobileUserLinks({ itemClass }: { itemClass: string }) {
  const t = useTranslations('nav');
  const viewer = useViewer();

  if (viewer === undefined) return null;

  if (viewer === null) {
    return (
      <>
        <Link href="/login" className={itemClass}>
          {t('login')}
        </Link>
        <Link href={{ pathname: '/register', query: { as: 'business' } }} className={itemClass}>
          {t('listBusiness')}
        </Link>
      </>
    );
  }

  return (
    <>
      <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {viewer.name ?? viewer.email}
      </p>

      {viewer.role === 'admin' && (
        <Link href="/admin" className={itemClass}>
          {t('adminArea')}
        </Link>
      )}
      {(viewer.role === 'business_owner' || viewer.role === 'admin') && (
        <Link href="/dashboard" className={itemClass}>
          {t('dashboard')}
        </Link>
      )}
      {viewer.role === 'traveler' && (
        <>
          <Link href="/account/favorites" className={itemClass}>
            {t('saved')}
          </Link>
          <Link href="/account/trips" className={itemClass}>
            {t('savedTrips')}
          </Link>
          <Link href="/account/sightings" className={itemClass}>
            {t('safariDiary')}
          </Link>
          <Link href="/account/enquiries" className={itemClass}>
            {t('myEnquiries')}
          </Link>
        </>
      )}
      <Link href="/account" className={itemClass}>
        {t('myAccount')}
      </Link>

      <button
        type="button"
        onClick={() => void endSessionAndReload()}
        className={cn(itemClass, 'w-full text-start')}
      >
        {t('signOut')}
      </button>
    </>
  );
}
