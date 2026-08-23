import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

/**
 * Grants the admin role to an existing account.
 *
 * Admin is deliberately not self-assignable: the signup path clamps the role to
 * traveler or business_owner, and a database trigger clamps it again, so the
 * only way to create the first administrator is deliberately, with the secret
 * key, from a machine that already has it.
 *
 * Usage:
 *   node scripts/dev-make-admin.mjs you@example.com
 *   node scripts/dev-make-admin.mjs you@example.com --revoke
 */

const [, , email, flag] = process.argv;
const revoke = flag === '--revoke';

if (!email) {
  console.error('Usage: node scripts/dev-make-admin.mjs <email> [--revoke]');
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const { data: list, error: listErr } = await admin.auth.admin.listUsers();
if (listErr) throw listErr;

const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No account found for ${email}. Sign up at /register first.`);
  process.exit(1);
}

const role = revoke ? 'traveler' : 'admin';
const { error } = await admin.from('profiles').update({ role }).eq('id', user.id);
if (error) throw error;

// Granting administrator rights is exactly the kind of thing that should be
// recorded, so this leaves the same trace an in-app action would.
await admin.from('audit_logs').insert({
  actor_id: null,
  action: revoke ? 'role.admin_revoked' : 'role.admin_granted',
  entity_type: 'profile',
  entity_id: user.id,
  after: { role, email, via: 'dev-make-admin script' },
});

console.log(
  revoke
    ? `${email} is no longer an administrator.`
    : `${email} is now an administrator. Sign in and open /admin.`,
);
