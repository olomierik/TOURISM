#!/usr/bin/env node
/**
 * Refuses a production build that is missing the variables sign-in depends on.
 *
 * Why this exists: in September 2026 the site moved to a host whose production
 * build had no Supabase variables. Nothing failed. The app quietly fell back to
 * hardcoded listings and a cookie-only "demo" sign-in, so every sign-up said
 * "check your inbox" for an account that was never created, every sign-in
 * "worked" without saving anything, and /admin opened for anyone. A failed build
 * keeps the last good deploy live; a silent one replaces it.
 *
 * Runs as `prebuild`. Only production builds on a real host are checked
 * (Netlify's CONTEXT=production, Vercel's VERCEL_ENV=production, or
 * REQUIRE_PRODUCTION_ENV=1). Local builds, CI typechecks and preview deploys
 * pass through, so a laptop without keys still builds.
 */

const isProductionHost =
  (process.env.NETLIFY === 'true' && process.env.CONTEXT === 'production') ||
  process.env.VERCEL_ENV === 'production' ||
  process.env.REQUIRE_PRODUCTION_ENV === '1';

if (!isProductionHost) {
  console.log('[check-env] not a production host build — skipping');
  process.exit(0);
}

/** A value copied from .env.example still holds its <placeholder>. */
const missing = (name) => {
  const v = process.env[name];
  return !v || v.includes('<') || v.includes('>');
};

const REQUIRED = {
  NEXT_PUBLIC_SUPABASE_URL: 'Supabase project URL (Supabase → Project Settings → API)',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'Supabase publishable/anon key',
  SUPABASE_SECRET_KEY: 'Supabase secret/service-role key (sign-up uses it to create the account)',
  NEXT_PUBLIC_SITE_URL: 'canonical origin, e.g. https://www.exploretanzania.online',
  RESEND_API_KEY: 'Resend key — sign-up confirmation mails are sent through it',
  EMAIL_FROM: 'sender, e.g. Explore Tanzania <notifications@exploretanzania.online>',
};

const problems = Object.entries(REQUIRED).filter(([name]) => missing(name));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!missing('NEXT_PUBLIC_SUPABASE_URL')) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') problems.push(['NEXT_PUBLIC_SUPABASE_URL', 'must be https://']);
  } catch {
    problems.push(['NEXT_PUBLIC_SUPABASE_URL', 'is not a valid URL']);
  }
}

if (problems.length) {
  console.error('\n[check-env] Production build stopped. These variables are missing or invalid:\n');
  for (const [name, why] of problems) console.error(`  - ${name}: ${why}`);
  console.error(
    '\nSet them in the host’s environment settings (Netlify: Site configuration → Environment variables),' +
      '\nscoped to builds AND functions, then redeploy. The previous deploy stays live until then.\n',
  );
  process.exit(1);
}

console.log('[check-env] production variables present');
