-- ===========================================================================
-- 086 — Enquiries are not rationed
--
-- Owner's call, 13 Nov 2026. Migration 083 capped the free plan at 2
-- enquiries a month and Premium at 30. `business_has_lead_capacity` (012)
-- drops an operator from matching once the cap is reached — so the cap does
-- not withhold something from the operator, it withholds an operator from a
-- traveller. With five enquiries in the site's whole life and 31 claimed
-- listings, a traveller whose request reaches two operators instead of five
-- is a traveller less likely to get a reply at all, and a traveller who gets
-- no reply does not come back.
--
-- Both capped plans go to unlimited. Premium has to move with Free: leaving
-- it at 30 would make the paid plan the one with the lower allowance.
--
-- What the paid plans sell is unchanged and is everything else: photographs,
-- packages, services, deals, analytics, and — the one that concerns
-- enquiries — `lead_priority`, which still puts a paying operator ahead of a
-- free one in every match. Seeing a lead first is a better thing to sell
-- than not being cut off from them.
--
-- Reversible: put numbers back in the column. Nothing else reads the cap.
-- ===========================================================================
begin;

update subscription_plans
   set monthly_lead_quota = null,
       updated_at = now()
 where key in ('free', 'premium')
   and monthly_lead_quota is not null;

do $$
declare
  n integer;
begin
  select count(*) into n from subscription_plans where monthly_lead_quota is not null;
  if n > 0 then
    raise exception '086: % plan(s) still carry an enquiry cap', n;
  end if;
end $$;

commit;
