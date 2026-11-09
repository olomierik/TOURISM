-- ===========================================================================
-- 085 — Going live is a switch, not a deploy
--
-- Erick, 9 November 2026: "Put a button on the admin page to turn and toggle
-- to LIVE."
--
-- ## Why this is not just a convenience
--
-- Until now the sandbox/live decision was `PADDLE_ENV`, an environment
-- variable. That has two faults, and this project has already been bitten by
-- both on the same day:
--
--   1. **Nobody can see it.** An environment variable is readable only in the
--      Netlify dashboard, one context at a time. When the sandbox credentials
--      were pasted in as a single shared value they silently replaced the live
--      ones in all five contexts, Production included, and nothing in the app
--      said so. An admin screen that states the mode out loud is the fix.
--
--   2. **`NEXT_PUBLIC_` is baked at build time.** The client token was read as
--      `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, which Next substitutes into the
--      bundle when the site is built. Changing it meant a rebuild, so "go
--      live" was a deploy — and a deploy is exactly the wrong amount of
--      ceremony for something you may need to undo in thirty seconds.
--
-- So the mode moves into the database, where it is one row, auditable through
-- `audit_logs` like every other setting, and takes effect on the next request.
--
-- ## What this does NOT do
--
-- It does not supply credentials. The live API key and webhook secret must
-- still exist in the runtime environment, as `PADDLE_API_KEY_LIVE`,
-- `PADDLE_WEBHOOK_SECRET_LIVE` and `PADDLE_CLIENT_TOKEN_LIVE`. A toggle cannot
-- invent a secret, and storing live keys in this table was rejected: the row is
-- readable by every admin, travels in every database backup, and would put a
-- payment credential somewhere nobody expects to find one.
--
-- The toggle therefore refuses to switch to live until those three are present
-- AND carry live prefixes (`pdl_live_` / `live_`). That last check is not
-- paranoia either — the credentials currently sitting in both `.env` and
-- Netlify are sandbox ones (`pdl_sdbx_` / `test_`), and a toggle that accepted
-- them would report "live" while taking no money.
--
-- Default false. A missing or unreadable setting means sandbox, for the same
-- reason `paddleEnvironment()` always defaulted that way: defaulting to
-- production would let a mistake take real money.
-- ===========================================================================

begin;

insert into platform_settings (key, value, description) values
  ('paddle_live', 'false'::jsonb,
   'Take real card payments through Paddle. Off means the Paddle sandbox: checkouts open in test mode and no money moves. Requires the PADDLE_*_LIVE credentials to be present before it can be switched on.')
on conflict (key) do nothing;

-- Prove it landed, so a half-applied migration cannot leave the admin screen
-- rendering a toggle with nothing behind it.
do $$
begin
  if not exists (select 1 from platform_settings where key = 'paddle_live') then
    raise exception '085: paddle_live setting was not created';
  end if;
end $$;

commit;
