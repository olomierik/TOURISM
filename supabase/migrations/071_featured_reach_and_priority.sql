-- ---------------------------------------------------------------------------
-- 071 — Featured operators reach every search and lead
--
-- Two separate problems, one cause.
--
-- A featured_listings row sold directory-wide placement, and then the lead
-- matcher excluded its holder from any enquiry that named a destination:
--
--   and (
--     lead_row.destination_id is null
--     or exists (select 1 from business_destinations bd ...)
--   )
--
-- The comment above that clause read "a business that serves nowhere in
-- particular is not a credible match for Serengeti", which is true of a
-- business that *declined* the Serengeti and false of one that never filled
-- the field in. Of the directory, almost nothing has filled it in: the
-- listings were imported from map data, which gives a name, a phone and a
-- coordinate and never a taxonomy. So the clause was not filtering on service
-- area, it was filtering on whether anyone had done data entry — and it
-- silently voided the one thing the platform sells.
--
-- The same exclusion ran on the public side, through the `!inner` joins in
-- searchBusinesses; that half is fixed in lib/queries/businesses.ts.
--
-- This migration:
--
--   1. Lets an operator holding an unscoped live boost match a destination- or
--      category-scoped lead when they have no rows on that axis at all. A
--      stated coverage list is still honoured exactly as before — silence is
--      relaxed, an answer never is.
--
--      Silence on destinations defaults to **their own country**, not to
--      everywhere: an operator who named no destinations serves every
--      destination in their country and none outside it. A Tanzanian operator
--      reaches Serengeti and Zanzibar enquiries, never Maasai Mara, because
--      placement they cannot service is worth nothing to either side.
--   2. Moves is_featured above plan_priority in the ranking, so featured
--      placement is the highest-ranking thing an operator can buy. This is not
--      a demotion of the tiers in practice: subscriptions are withdrawn
--      (SUBSCRIPTIONS_ENABLED is false) and 2,615 of 2,618 listings are on
--      `free`, so plan_priority currently orders almost nothing. `reachable`
--      stays on top of both, because 052 put it there for a reason that has
--      not changed: a slot spent on an operator with no email is an enquiry
--      nobody answers, and no amount of placement fixes that.
--   3. Counts a boost as paying for the purpose of strong-lead restriction. An
--      operator who bought placement has paid; locking them out of exactly the
--      high-quality leads they paid to receive was the wrong way round.
--   4. Records why in match_reason, so "why did I get this lead?" still has an
--      answer when the answer is "your featured placement reached it".
-- ---------------------------------------------------------------------------

-- Any live boost: the operator is paying for placement right now.
create or replace function has_live_boost(target_business uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from featured_listings f
    where f.business_id = target_business
      and f.is_active
      and f.starts_at <= now()
      and (f.ends_at is null or f.ends_at > now())
  );
$$;

-- A live boost with no destination or category limit on it. Only this kind
-- widens reach: a boost sold for one destination stays in that destination.
create or replace function has_unscoped_boost(target_business uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from featured_listings f
    where f.business_id = target_business
      and f.is_active
      and f.starts_at <= now()
      and (f.ends_at is null or f.ends_at > now())
      and f.placement in ('homepage', 'directory', 'search')
  );
$$;

comment on function has_unscoped_boost(uuid) is
  'True when the business holds a live directory-wide featured placement. Such a business matches a scoped lead even with no taxonomy rows on that axis.';

create or replace function match_lead_to_businesses(target_lead uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  lead_row       leads%rowtype;
  max_matches    integer;
  premium_only_threshold integer;
  restrict_to_paid boolean;
  distributed    integer := 0;
  topped_up      integer := 0;
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
      has_live_boost(b.id) as is_featured,
      -- Whether this operator can be told about the lead at all. A listing
      -- imported from a map has a name, a phone and no email; a claimed one
      -- has an owner whose account address is verified. Everything else here
      -- ranks operators against each other, and none of it matters if the
      -- winner never hears about the enquiry.
      (b.email is not null or b.owner_id is not null) as reachable,
      coalesce(b.response_rate, 0) as response_rate,
      b.rating_avg,
      b.rating_count,
      b.tier,
      -- Why this business matched, retained so "why did I get this lead?" has
      -- an answer. `featured_reach` is set when the match exists only because
      -- a directory-wide boost reached past an unfilled taxonomy.
      jsonb_strip_nulls(jsonb_build_object(
        'destination', case when lead_row.destination_id is not null
          and exists (select 1 from business_destinations bd
                      where bd.business_id = b.id and bd.destination_id = lead_row.destination_id)
          then true end,
        'category', case when lead_row.category_id is not null
          and exists (select 1 from business_categories bc
                      where bc.business_id = b.id and bc.category_id = lead_row.category_id)
          then true end,
        'featured', case when has_live_boost(b.id) then true end,
        'featured_reach', case when has_unscoped_boost(b.id)
          and (
            (lead_row.destination_id is not null
              and not exists (select 1 from business_destinations bd where bd.business_id = b.id))
            or (lead_row.category_id is not null
              and not exists (select 1 from business_categories bc where bc.business_id = b.id))
          )
          then true end,
        'tier', b.tier::text,
        'quality_score', lead_row.quality_score
      )) as match_reason
    from businesses b
    left join subscriptions s on s.business_id = b.id and s.status = 'active'
    left join subscription_plans p on p.id = s.plan_id
    where b.status = 'approved'
      and b.deleted_at is null
      -- Destination must match when the traveller named one — unless the
      -- operator holds a directory-wide boost and has named no destinations at
      -- all, which is silence rather than a declined service area.
      and (
        lead_row.destination_id is null
        or exists (
          select 1 from business_destinations bd
          where bd.business_id = b.id and bd.destination_id = lead_row.destination_id
        )
        or (
          has_unscoped_boost(b.id)
          and not exists (select 1 from business_destinations bd where bd.business_id = b.id)
          -- Defaults to their own country, not the whole directory: an
          -- operator who named no destinations serves every destination in
          -- their country and none outside it.
          and b.country_code = (
            select d.country_code from destinations d where d.id = lead_row.destination_id
          )
        )
      )
      and (
        lead_row.category_id is null
        or exists (
          select 1 from business_categories bc
          where bc.business_id = b.id and bc.category_id = lead_row.category_id
        )
        or (
          has_unscoped_boost(b.id)
          and not exists (select 1 from business_categories bc where bc.business_id = b.id)
        )
      )
      and business_has_lead_capacity(b.id)
      -- A boost is a payment, so it clears the paid-tier gate on strong leads.
      and (not restrict_to_paid or b.tier <> 'free' or has_live_boost(b.id))
  ),
  ranked as (
    select
      id,
      match_reason,
      row_number() over (
        order by
          -- 052's key, still first: there are only five slots per enquiry and
          -- a slot spent on an operator with no email is a dead lead.
          reachable desc,
          -- Featured placement is the highest-ranking thing an operator can
          -- buy, above subscription tier.
          is_featured desc,
          plan_priority asc,
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
  -- free listings than left unanswered. This used to retry only when the
  -- restricted pass reached *nobody*, which broke the moment a boost cleared
  -- the paid gate: one featured operator made the pass "succeed" with a single
  -- match, the retry was skipped, and an enquiry that previously reached five
  -- operators reached one. Measured on lead 0e457fe6 — 5 recipients down to 1.
  --
  -- So it tops up instead of standing in: the restricted pass keeps the top
  -- ranks, and the remaining slots are filled unrestricted. A featured operator
  -- still takes rank 1 of five, which is the placement that was sold; what it
  -- no longer does is empty the other four seats.
  if distributed < max_matches and restrict_to_paid then
    with eligible as (
      select b.id,
             coalesce(p.lead_priority, 300) as plan_priority,
             has_live_boost(b.id) as is_featured,
             (b.email is not null or b.owner_id is not null) as reachable,
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
          or (
            has_unscoped_boost(b.id)
            and not exists (select 1 from business_destinations bd where bd.business_id = b.id)
            and b.country_code = (
              select d.country_code from destinations d where d.id = lead_row.destination_id
            )
          )
        )
        and (
          lead_row.category_id is null
          or exists (select 1 from business_categories bc
                     where bc.business_id = b.id and bc.category_id = lead_row.category_id)
          or (
            has_unscoped_boost(b.id)
            and not exists (select 1 from business_categories bc where bc.business_id = b.id)
          )
        )
        and business_has_lead_capacity(b.id)
        -- Whoever the restricted pass already matched keeps their rank.
        and not exists (
          select 1 from lead_businesses lb
          where lb.lead_id = target_lead and lb.business_id = b.id
        )
    ),
    ranked as (
      select id, row_number() over (
        order by reachable desc, is_featured desc, plan_priority asc,
                 response_rate desc, rating_avg desc, rating_count desc, random()
      ) as rank
      from eligible
    )
    insert into lead_businesses (lead_id, business_id, rank, match_reason)
    select target_lead, id, (rank + distributed)::smallint,
           jsonb_build_object('fallback', true, 'quality_score', lead_row.quality_score)
    from ranked
    where rank <= max_matches - distributed;

    get diagnostics topped_up = row_count;
    distributed := distributed + topped_up;
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
      'topped_up', topped_up,
      'quality_score', lead_row.quality_score
    )
  );

  return distributed;
end;
$function$;
