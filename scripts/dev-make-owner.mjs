import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

/**
 * Development helper: attach a demo business to an existing account so the
 * dashboard has something to show.
 *
 * Usage:
 *   node scripts/dev-make-owner.mjs you@example.com [business-slug]
 *
 * Deliberately operates on an account you already created through the normal
 * signup flow rather than minting one with a preset password — a shared
 * known-password login on a live project is exactly the kind of thing that
 * survives to launch by accident.
 *
 * Optionally seeds one realistic enquiry so the inbox is not empty.
 */

const [, , email, slugArg] = process.argv;

if (!email) {
  console.error('Usage: node scripts/dev-make-owner.mjs <email> [business-slug]');
  process.exit(1);
}

const slug = slugArg ?? 'demo-serengeti-plains-safaris';

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

// The dashboard is gated on the business_owner role.
await admin.from('profiles').update({ role: 'business_owner' }).eq('id', user.id);

const { data: business, error: bizErr } = await admin
  .from('businesses')
  .select('id, name')
  .eq('slug', slug)
  .maybeSingle();

if (bizErr) throw bizErr;
if (!business) {
  console.error(`No business with slug "${slug}".`);
  process.exit(1);
}

await admin.from('businesses').update({ owner_id: user.id }).eq('id', business.id);

// Only seed an enquiry if the inbox is empty, so re-running does not pile up.
const { count } = await admin
  .from('lead_businesses')
  .select('id', { count: 'exact', head: true })
  .eq('business_id', business.id);

if ((count ?? 0) === 0) {
  const { data: dest } = await admin
    .from('destinations')
    .select('id')
    .eq('key', 'serengeti')
    .single();

  const { data: lead } = await admin
    .from('leads')
    .insert({
      full_name: 'Amelia Hart',
      email: 'amelia.hart@example.test',
      phone: '+255700123456',
      destination_id: dest.id,
      travel_start: '2027-08-02',
      travel_end: '2027-08-12',
      adults: 2,
      budget_min: 5000,
      budget_max: 8000,
      interests: ['wildlife', 'photography'],
      message:
        'Two of us, first time in Tanzania, hoping to catch the Mara river crossings. We would prefer a private vehicle and a guide who knows birds well.',
    })
    .select('id, reference')
    .single();

  await admin.rpc('match_lead_to_businesses', { target_lead: lead.id });
  console.log(`Seeded demo enquiry ${lead.reference}.`);
}

console.log(`${email} now owns "${business.name}". Sign in and open /dashboard.`);
