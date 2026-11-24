-- ===========================================================================
-- 096 — Fill trip types/activities from category and name; per-country counts
-- (second half of 095: a new enum value cannot be used in the transaction
-- that adds it).
-- ===========================================================================
begin;

with ops as (
  select b.id, lower(b.name) as nm,
         bool_or(c.key = 'safaris') as is_safari
  from businesses b
  join business_categories bc on bc.business_id = b.id
  join categories c on c.id = bc.category_id
  where b.status = 'approved' and b.deleted_at is null
    and c.key in ('safaris', 'activities', 'tour-guides')
  group by b.id, b.name
),
intents as (
  select id, 'safari'::trip_intent as intent, 'category' as source from ops
    where is_safari and not exists (select 1 from business_intents i where i.business_id = ops.id)
  union all
  select id, 'mountain', 'name' from ops
    where nm ~ '(kilimanjaro|\mkili\M|climb|trek|mount kenya|\mmeru\M|rwenzori|hiking|summit|mountain)'
      and nm !~ 'mountain gorilla|gorilla trek'
  union all
  select id, 'beach', 'name' from ops
    where nm ~ '(beach|diani|watamu|malindi|\mlamu\M|ocean|island|coast)'
)
insert into business_intents (business_id, intent, source)
select id, intent, source from intents
on conflict (business_id, intent) do nothing;

with ops as (
  select distinct b.id, lower(b.name) as nm
  from businesses b
  join business_categories bc on bc.business_id = b.id
  join categories c on c.id = bc.category_id
  where b.status = 'approved' and b.deleted_at is null
    and c.key in ('safaris', 'activities', 'tour-guides')
),
acts as (
  select id, 'balloon'::trip_activity as activity from ops where nm ~ 'balloon'
  union all select id, 'bird_watching' from ops where nm ~ '\mbird'
  union all select id, 'walking_safaris' from ops where nm ~ 'walking'
  union all select id, 'diving' from ops where nm ~ '(\mdiv(e|ing|ers?)\M|scuba)'
  union all select id, 'snorkeling' from ops where nm ~ 'snorkel'
  union all select id, 'spice_tours' from ops where nm ~ 'spice'
  union all select id, 'cultural_tours' from ops where nm ~ '(cultur|heritage|village|maasai|masai)'
  union all select id, 'gorilla_trekking' from ops where nm ~ '(gorilla|primate|chimp)'
  union all select id, 'photography' from ops where nm ~ 'photo'
  union all select id, 'day_trips' from ops where nm ~ '(day trip|excursion)'
)
insert into business_activities (business_id, activity, source)
select id, activity, 'name' from acts
on conflict (business_id, activity) do nothing;

-- How many listings carry each trip type and activity, in one country or in
-- all of them, so the directory can label its chips and grey out the empty
-- ones instead of letting a click find nothing.
create or replace function trip_tag_counts(p_country text default null)
returns table (kind text, value text, n integer)
language sql
stable
set search_path = public
as $$
  select 'intent', i.intent::text, count(*)::int
  from business_intents i
  join businesses b on b.id = i.business_id
  where b.status = 'approved' and b.deleted_at is null and not b.is_demo
    and (p_country is null or b.country_code = upper(p_country))
  group by i.intent
  union all
  select 'activity', a.activity::text, count(*)::int
  from business_activities a
  join businesses b on b.id = a.business_id
  where b.status = 'approved' and b.deleted_at is null and not b.is_demo
    and (p_country is null or b.country_code = upper(p_country))
  group by a.activity;
$$;

grant execute on function trip_tag_counts(text) to anon, authenticated;

commit;
