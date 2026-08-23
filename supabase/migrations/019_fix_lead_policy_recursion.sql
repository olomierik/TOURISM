-- ===========================================================================
-- 019 — Break the RLS recursion between leads and lead_businesses
--
-- The two policies referenced each other:
--
--   leads_read_distributed      reads lead_businesses to ask "was this routed to
--                               a business I own?"
--   lead_businesses_read        reads leads to ask "is this my own enquiry?"
--
-- Evaluating either one therefore re-enters the other, and Postgres aborts with
-- "infinite recursion detected in policy for relation leads". The failure is
-- invisible until a signed-in business owner actually queries their leads, which
-- is exactly what the dashboard does on every page load.
--
-- The fix is to do each inner lookup inside a security definer function. Those
-- run as the owner, so RLS is not re-applied to the inner query and the cycle is
-- cut. Both functions are narrow: they take one id, return one boolean, and
-- expose nothing the caller could not already establish about their own rows.
-- search_path is pinned, as with every other security definer function here.
-- ===========================================================================

create or replace function lead_is_distributed_to_me(target_lead uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from lead_businesses lb
    join businesses b on b.id = lb.business_id
    where lb.lead_id = target_lead
      and b.owner_id = auth.uid()
      and b.deleted_at is null
  );
$$;

create or replace function lead_belongs_to_me(target_lead uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from leads
    where id = target_lead
      and traveler_id = auth.uid()
  );
$$;

-- Callable by signed-in users because the policies below evaluate as the caller.
revoke execute on function lead_is_distributed_to_me(uuid) from public;
revoke execute on function lead_belongs_to_me(uuid) from public;
grant  execute on function lead_is_distributed_to_me(uuid) to authenticated, service_role;
grant  execute on function lead_belongs_to_me(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Rewrite the two policies in terms of the helpers.
-- ---------------------------------------------------------------------------
drop policy if exists leads_read_distributed on leads;
create policy leads_read_distributed on leads
  for select to authenticated
  using (lead_is_distributed_to_me(id));

drop policy if exists lead_businesses_read on lead_businesses;
create policy lead_businesses_read on lead_businesses
  for select to authenticated
  using (
    owns_business(business_id)
    or lead_belongs_to_me(lead_id)
    or is_admin()
  );

-- lead_events joined leads the same way and had the same latent cycle.
drop policy if exists lead_events_read on lead_events;
create policy lead_events_read on lead_events
  for select to authenticated
  using (
    is_admin()
    or lead_belongs_to_me(lead_id)
    or (business_id is not null and owns_business(business_id))
  );
