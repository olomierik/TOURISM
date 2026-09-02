-- ===========================================================================
-- 052 — A lead that reaches nobody is not a lead
--
-- Every enquiry ever submitted matched operators, and no operator was told.
-- The distribution logic was working perfectly: a Serengeti safari request
-- matched five operators ranked by tier, featured status, response rate and
-- rating. All five had no email address.
--
-- That is not a coincidence. 646 of 2,067 approved listings carry an email —
-- the rest were imported from map data, which gives a name, a phone and a
-- website and never an address. Three listings in total have been claimed by
-- their owner. So the ranking was choosing five operators on merit from a pool
-- where two in three cannot be contacted, and the enquiry died in the gap.
--
-- The fix is one sort key. `reachable` goes directly under plan_priority, so a
-- paying operator still outranks a free one and nothing commercial changes —
-- but within a tier, an operator who will actually see the enquiry comes
-- before one who never will. There are only five slots per lead, and a slot
-- spent on an unreachable listing is a traveller who gets no reply.
--
-- Reachable means an email on the listing, or an owner: a claimed listing has
-- an account whose address is verified, and the dashboard shows them the lead
-- whether or not the business record carries an address of its own.
--
-- The rest of the function is unchanged from 012. It is reproduced in full
-- because replacing a function means replacing all of it.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.match_lead_to_businesses(target_lead uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      -- Whether this operator can be told about the lead at all. A listing
      -- imported from a map has a name, a phone and no email; a claimed one
      -- has an owner whose account address is verified. Everything else here
      -- ranks operators against each other, and none of it matters if the
      -- winner never hears about the enquiry.
      (b.email is not null or b.owner_id is not null) as reachable,
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
          -- Under plan priority, so a paying operator still outranks a free
          -- one and the commercial promise is unchanged. Above everything
          -- else, because there are only five slots per enquiry and a slot
          -- spent on an operator with no email is an enquiry nobody answers.
          reachable desc,
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
        order by plan_priority asc, reachable desc, response_rate desc,
                 rating_avg desc, rating_count desc, random()
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
$function$

