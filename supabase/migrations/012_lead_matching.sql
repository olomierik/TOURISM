-- ===========================================================================
-- 012 — Lead matching
--
-- Runs entirely server-side. Distribution decides who gets paid attention and
-- in what order, so it must not be expressible from the client: a business that
-- could influence its own rank would corrupt the product's core promise.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Has this business already used up its plan's monthly allowance?
-- ---------------------------------------------------------------------------
create or replace function business_has_lead_capacity(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.monthly_lead_quota is null
          or (
            select count(*)
            from lead_businesses lb
            where lb.business_id = target
              and lb.sent_at >= date_trunc('month', now())
          ) < p.monthly_lead_quota
      from subscriptions s
      join subscription_plans p on p.id = s.plan_id
      where s.business_id = target and s.status = 'active'
      limit 1
    ),
    -- No active subscription: fall back to the free plan's allowance.
    (
      select (
        select count(*)
        from lead_businesses lb
        where lb.business_id = target
          and lb.sent_at >= date_trunc('month', now())
      ) < p.monthly_lead_quota
      from subscription_plans p
      where p.key = 'free'
    ),
    true
  );
$$;

-- ---------------------------------------------------------------------------
-- match_lead_to_businesses
--
-- Selects eligible businesses for an enquiry, ranks them, records the
-- distribution and queues a notification for each recipient.
--
-- Ranking, in order:
--   1. Plan priority        — what premium tiers are actually buying
--   2. Live featured placement
--   3. Responsiveness       — operators who reply get more; this is the flywheel
--   4. Rating, then review volume
--   5. Random tiebreak      — so equally-ranked operators share evenly over time
--                             rather than the same one always winning on id order
--
-- Strong leads (quality at or above the configured threshold) are reserved for
-- paying tiers first; weaker ones are opened to everyone so free listings still
-- see value and have a reason to upgrade.
-- ---------------------------------------------------------------------------
create or replace function match_lead_to_businesses(target_lead uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  lead_row       leads%rowtype;
  max_matches    integer;
  premium_only_threshold integer;
  restrict_to_paid boolean;
  distributed    integer := 0;
begin
  select * into lead_row from leads where id = target_lead;
  if not found then
    raise exception 'Lead % not found', target_lead;
  end if;

  -- Re-running must not double-send.
  if exists (select 1 from lead_businesses where lead_id = target_lead) then
    return 0;
  end if;

  select coalesce((value #>> '{}')::integer, 5) into max_matches
  from platform_settings where key = 'lead_distribution_limit';

  select coalesce((value #>> '{}')::integer, 60) into premium_only_threshold
  from platform_settings where key = 'lead_min_quality_for_premium';

  restrict_to_paid := lead_row.quality_score >= premium_only_threshold;

  with eligible as (
    select
      b.id,
      coalesce(p.lead_priority, 300) as plan_priority,
      exists (
        select 1 from featured_listings f
        where f.business_id = b.id
          and f.is_active
          and f.starts_at <= now()
          and (f.ends_at is null or f.ends_at > now())
      ) as is_featured,
      coalesce(b.response_rate, 0) as response_rate,
      b.rating_avg,
      b.rating_count,
      b.tier,
      -- Why this business matched, retained so "why did I get this lead?" has an answer.
      jsonb_strip_nulls(jsonb_build_object(
        'destination', case when lead_row.destination_id is not null
          and exists (select 1 from business_destinations bd
                      where bd.business_id = b.id and bd.destination_id = lead_row.destination_id)
          then true end,
        'category', case when lead_row.category_id is not null
          and exists (select 1 from business_categories bc
                      where bc.business_id = b.id and bc.category_id = lead_row.category_id)
          then true end,
        'tier', b.tier::text,
        'quality_score', lead_row.quality_score
      )) as match_reason
    from businesses b
    left join subscriptions s on s.business_id = b.id and s.status = 'active'
    left join subscription_plans p on p.id = s.plan_id
    where b.status = 'approved'
      and b.deleted_at is null
      -- Destination must match when the traveler named one. A business that
      -- serves nowhere in particular is not a credible match for "Serengeti".
      and (
        lead_row.destination_id is null
        or exists (
          select 1 from business_destinations bd
          where bd.business_id = b.id and bd.destination_id = lead_row.destination_id
        )
      )
      and (
        lead_row.category_id is null
        or exists (
          select 1 from business_categories bc
          where bc.business_id = b.id and bc.category_id = lead_row.category_id
        )
      )
      and business_has_lead_capacity(b.id)
      and (not restrict_to_paid or b.tier <> 'free')
  ),
  ranked as (
    select
      id,
      match_reason,
      row_number() over (
        order by
          plan_priority asc,
          is_featured desc,
          response_rate desc,
          rating_avg desc,
          rating_count desc,
          random()
      ) as rank
    from eligible
  )
  insert into lead_businesses (lead_id, business_id, rank, match_reason)
  select target_lead, id, rank::smallint, match_reason
  from ranked
  where rank <= max_matches;

  get diagnostics distributed = row_count;

  -- A high-value lead nobody paid-tier could serve is worth more distributed to
  -- free listings than left unanswered. Retry once, unrestricted.
  if distributed = 0 and restrict_to_paid then
    with eligible as (
      select b.id, coalesce(p.lead_priority, 300) as plan_priority,
             coalesce(b.response_rate, 0) as response_rate, b.rating_avg, b.rating_count
      from businesses b
      left join subscriptions s on s.business_id = b.id and s.status = 'active'
      left join subscription_plans p on p.id = s.plan_id
      where b.status = 'approved'
        and b.deleted_at is null
        and (
          lead_row.destination_id is null
          or exists (select 1 from business_destinations bd
                     where bd.business_id = b.id and bd.destination_id = lead_row.destination_id)
        )
        and (
          lead_row.category_id is null
          or exists (select 1 from business_categories bc
                     where bc.business_id = b.id and bc.category_id = lead_row.category_id)
        )
        and business_has_lead_capacity(b.id)
    ),
    ranked as (
      select id, row_number() over (
        order by plan_priority asc, response_rate desc, rating_avg desc, rating_count desc, random()
      ) as rank
      from eligible
    )
    insert into lead_businesses (lead_id, business_id, rank, match_reason)
    select target_lead, id, rank::smallint,
           jsonb_build_object('fallback', true, 'quality_score', lead_row.quality_score)
    from ranked
    where rank <= max_matches;

    get diagnostics distributed = row_count;
  end if;

  -- Notify each recipient's owner.
  insert into notifications (profile_id, kind, lead_id, business_id, payload)
  select b.owner_id, 'lead_new', target_lead, b.id,
         jsonb_build_object(
           'reference', lead_row.reference,
           'destination_id', lead_row.destination_id,
           'quality_score', lead_row.quality_score
         )
  from lead_businesses lb
  join businesses b on b.id = lb.business_id
  where lb.lead_id = target_lead
    and b.owner_id is not null;

  update leads
  set status = case when distributed > 0 then 'distributed'::lead_status else status end,
      distributed_at = case when distributed > 0 then now() else distributed_at end
  where id = target_lead;

  insert into lead_events (lead_id, event, detail)
  values (
    target_lead,
    'distributed',
    jsonb_build_object(
      'count', distributed,
      'restricted_to_paid', restrict_to_paid,
      'quality_score', lead_row.quality_score
    )
  );

  return distributed;
end;
$$;

-- ---------------------------------------------------------------------------
-- Advance the parent lead when any recipient engages, so the traveler's
-- enquiry view reflects reality without the app polling every child row.
-- ---------------------------------------------------------------------------
create or replace function lead_businesses_advance_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('responded', 'quoted', 'won') then
    update leads
    set status = 'in_progress'
    where id = new.lead_id and status = 'distributed';
  end if;

  insert into lead_events (lead_id, business_id, event, detail)
  values (
    new.lead_id,
    new.business_id,
    'business_status_' || new.status::text,
    jsonb_build_object('rank', new.rank)
  );

  return null;
end;
$$;

create trigger lead_businesses_advance_parent_trigger
  after update of status on lead_businesses
  for each row
  when (new.status is distinct from old.status)
  execute function lead_businesses_advance_parent();
