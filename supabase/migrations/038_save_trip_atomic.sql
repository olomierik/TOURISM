-- ===========================================================================
-- 038 — A saved trip has stops, enforced rather than intended
--
-- 037 made a trip a parent row with child stops, which over PostgREST means two
-- HTTP requests and therefore two transactions. Between them there is a window
-- where a trip exists with nothing in it, and the verification suite walked
-- straight into it: a stops insert rejected by the duplicate-destination unique
-- index left the parent behind, and "one saved trip has zero stops" failed.
--
-- The server action already deleted the parent when the stops insert failed, so
-- the product was correct. But a compensating delete is a promise made by one
-- caller, and the row is reachable by anyone with the publishable key. The
-- window was real; it was just usually closed by good manners.
--
-- Two changes shut it. save_trip() writes both in one transaction, and a
-- deferred constraint checks at commit that the trip has at least one stop —
-- which is only satisfiable from inside a transaction that inserts both, so a
-- parent-only insert now fails instead of orphaning.
--
-- security invoker, deliberately. RLS still applies inside the function, so it
-- cannot be used to write into somebody else's account; the profile is taken
-- from the session rather than from an argument, so there is nothing to forge.
-- ===========================================================================

create or replace function saved_trip_has_stops()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from saved_trip_stops s where s.trip_id = new.id) then
    raise exception 'a saved trip must have at least one stop'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger saved_trips_require_stops
  after insert on saved_trips
  deferrable initially deferred
  for each row execute function saved_trip_has_stops();

-- ---------------------------------------------------------------------------
-- The one way to write a trip.
--
-- Stops arrive as [{"destination_id": "...", "nights": 4}, ...] in visiting
-- order; position comes from the array index, so the caller cannot supply an
-- order that disagrees with the list it sent.
-- ---------------------------------------------------------------------------
create or replace function save_trip(
  p_name       text,
  p_style      text,
  p_travellers smallint,
  p_stops      jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_trip uuid;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  v_count := jsonb_array_length(coalesce(p_stops, '[]'::jsonb));
  if v_count = 0 then
    raise exception 'a trip needs at least one stop' using errcode = 'check_violation';
  end if;

  -- An unnamed trip arrives as an empty string rather than a null, because the
  -- generated client types the argument as text. Blank means unnamed here;
  -- storing it as '' would trip the name-length constraint on the way in.
  insert into saved_trips (profile_id, name, style, travellers, stop_count)
  values (
    auth.uid(),
    nullif(btrim(coalesce(p_name, '')), ''),
    p_style, p_travellers, v_count
  )
  returning id into v_trip;

  insert into saved_trip_stops (trip_id, destination_id, nights, position)
  select v_trip,
         (s.value ->> 'destination_id')::uuid,
         (s.value ->> 'nights')::smallint,
         (s.ordinality - 1)::smallint
    from jsonb_array_elements(p_stops) with ordinality as s(value, ordinality);

  return v_trip;
end;
$$;

revoke all on function save_trip(text, text, smallint, jsonb) from public;
grant execute on function save_trip(text, text, smallint, jsonb) to authenticated;

comment on function save_trip(text, text, smallint, jsonb) is
  'Saves a trip and its stops in one transaction. Runs as the caller, so RLS decides ownership and the profile comes from the session rather than an argument.';
