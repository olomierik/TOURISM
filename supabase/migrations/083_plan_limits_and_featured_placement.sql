-- ===========================================================================
-- 083 — The owner's plan limits, and Featured that actually features
--
-- Two changes, both decided by Erick on 9 November 2026 when the subscription
-- page was rebuilt to show limits rather than only inclusions.
--
-- ## 1. New caps
--
--             photos  packages  services  enquiries/month
--   free        10→2      2→2       3→2             5→2
--   premium    30→10     20→10     20→10           50→30
--   featured   60→∞       ∞→∞       ∞→∞             ∞→∞
--
-- The free tier drops hard on purpose. It was generous enough that an operator
-- could run a complete listing on it — ten photographs is a gallery — and a
-- free tier with nothing missing is not a funnel, it is the product. Two of
-- everything is enough to prove the listing works and visibly not enough to
-- trade on.
--
-- Measured before applying, on the 28 owned listings sitting on the free plan:
-- **nobody loses anything they have.** 0 exceed 2 packages, 0 exceed 2
-- services, and 6 hold more than 2 photographs (the largest holds 10, the mean
-- is 1.6). The gallery guard in migration 021 refuses an *insert* past the cap
-- and never deletes, so those 6 keep every photograph they uploaded and simply
-- cannot add an eleventh. That is the intended shape: no operator wakes up to
-- a smaller listing, and the cap starts biting on the next upload.
--
-- Featured's photo cap becomes null rather than 60. Null already means
-- unlimited everywhere that reads these columns, and Featured was the only
-- plan claiming "unlimited" in the card copy while carrying a number.
--
-- ## 2. A Featured subscription creates its own homepage placement
--
-- `featured_listings` has existed since migration 008 and has been written
-- only by admins (PR #97's boosts). `match_lead_to_businesses` already ranks a
-- live featured row above everything else, and `FeaturedOperators` on the home
-- page already puts boosted operators first. So the machinery for "enhanced
-- visibility" was complete except for the one thing that would let an operator
-- buy it: nothing ever created a row from a subscription.
--
-- This adds that, and only for the `featured` plan. The row is scoped
-- `homepage`, starts when the subscription period starts and ends exactly when
-- it ends, so the placement expires with the plan and nobody has to remember
-- to switch it off — `featured_read` already hides a row outside its window.
--
-- It is deliberately **not** a badge and **not** a reordering of search
-- results. §6.4 says a trust mark may not be bought and that half stands;
-- MONETISATION.md §5 said not to sell placement at all, which this reverses,
-- and the reversal is recorded there rather than hidden here.
--
-- One row per business, so a renewal extends the window instead of stacking a
-- second placement. priority 100 matches what `lead_priority` already gives
-- the featured plan, so the two agree rather than fighting.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. The caps
-- ---------------------------------------------------------------------------
update subscription_plans set
  max_gallery_images = 2,
  max_packages       = 2,
  max_services       = 2,
  monthly_lead_quota = 2,
  updated_at         = now()
where key = 'free';

update subscription_plans set
  max_gallery_images = 10,
  max_packages       = 10,
  max_services       = 10,
  monthly_lead_quota = 30,
  updated_at         = now()
where key = 'premium';

update subscription_plans set
  max_gallery_images = null,
  max_packages       = null,
  max_services       = null,
  monthly_lead_quota = null,
  updated_at         = now()
where key = 'featured';

-- Prove it landed. A silent no-op here would leave the pricing page telling
-- operators one thing and the guards enforcing another, which is the exact
-- failure this migration exists to end.
do $$
declare
  n integer;
begin
  select count(*) into n from subscription_plans
   where (key = 'free'     and (max_gallery_images, max_packages, max_services, monthly_lead_quota) is distinct from (2, 2, 2, 2))
      or (key = 'premium'  and (max_gallery_images, max_packages, max_services, monthly_lead_quota) is distinct from (10, 10, 10, 30))
      or (key = 'featured' and num_nulls(max_gallery_images, max_packages, max_services, monthly_lead_quota) <> 4);
  if n > 0 then
    raise exception '083: % plan(s) did not take the new limits', n;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Featured subscription -> homepage placement
-- ---------------------------------------------------------------------------

-- One placement per business for the plan to own. A partial unique index
-- rather than a constraint on the table: admin boosts are rows in here too and
-- must stay free to overlap, so only the subscription-owned ones are limited.
create unique index if not exists featured_listings_one_plan_row
  on featured_listings (business_id)
  where created_by is null and placement = 'homepage';

create or replace function sync_featured_placement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_featured boolean;
  biz uuid;
begin
  biz := coalesce(new.business_id, old.business_id);

  -- NEW is null on DELETE, so the plan lookup has to be guarded rather than
  -- written above the branch: reading new.plan_id there raises on every
  -- delete, and a trigger that throws would block the delete itself.
  if tg_op <> 'DELETE' then
    select p.key = 'featured'
      into is_featured
      from subscription_plans p
     where p.id = new.plan_id;
  end if;

  if tg_op <> 'DELETE'
     and coalesce(is_featured, false)
     and new.status = 'active'
     and (new.current_period_end is null or new.current_period_end > now())
  then
    insert into featured_listings (business_id, placement, priority, starts_at, ends_at, is_active)
    values (
      biz,
      'homepage',
      100,
      coalesce(new.current_period_start, now()),
      new.current_period_end,
      true
    )
    on conflict (business_id) where (created_by is null and placement = 'homepage')
    do update set
      starts_at  = excluded.starts_at,
      ends_at    = excluded.ends_at,
      is_active  = true,
      updated_at = now();
  else
    -- Downgrade, cancellation, expiry or deletion. The row is deactivated
    -- rather than deleted so the history of what was sold survives.
    update featured_listings
       set is_active = false, updated_at = now()
     where business_id = biz
       and created_by is null
       and placement = 'homepage';
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists subscriptions_sync_featured on subscriptions;
create trigger subscriptions_sync_featured
  after insert or update or delete on subscriptions
  for each row execute function sync_featured_placement();

-- Backfill anything already on the featured plan, so the trigger is not the
-- only thing that has ever been right.
update subscriptions set updated_at = updated_at
 where status = 'active'
   and plan_id in (select id from subscription_plans where key = 'featured');

commit;
