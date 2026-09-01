-- ===========================================================================
-- 046 — Proximity search that knows what it knows
--
-- 045 placed 309 listings from their city, taking near-me coverage from 69% to
-- 93%. This lets the search return them without letting the page lie about
-- them: the function now reports how well each location is known, so a card can
-- say "2.1 km away" for a real coordinate and "In Nairobi" for a centroid.
--
-- Ordering still uses the computed distance for both, and that is correct even
-- for a centroid — a Nairobi office really is nearer to somebody in Nairobi
-- than a Mombasa one is. What changes is only whether a number is shown.
--
-- Exact locations sort first within the same distance. Given two operators the
-- same nominal distance away, the one whose position is actually known is the
-- better answer.
-- ===========================================================================

-- The return signature changes, and Postgres will not replace a function whose
-- result columns differ. Dropped explicitly rather than left to fail: the drop
-- is the change, and hiding it behind a create-or-replace that cannot work
-- would just move the error to whoever runs this next.
drop function if exists businesses_near(double precision, double precision, integer, integer);

create function businesses_near(
  p_lat       double precision,
  p_lng       double precision,
  p_radius_km integer default 50,
  p_limit     integer default 24
) returns table (
  id          uuid,
  distance_km double precision,
  precision_level text
)
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      p_lat - (p_radius_km / 111.0)                                      as min_lat,
      p_lat + (p_radius_km / 111.0)                                      as max_lat,
      p_lng - (p_radius_km / greatest(1.0, 111.0 * cos(radians(p_lat)))) as min_lng,
      p_lng + (p_radius_km / greatest(1.0, 111.0 * cos(radians(p_lat)))) as max_lng
  ),
  candidates as (
    select b.id,
           b.latitude::double precision  as lat,
           b.longitude::double precision as lng,
           b.location_precision::text    as precision_level
      from businesses b, bounds
     where b.status = 'approved'
       and b.deleted_at is null
       and b.latitude between bounds.min_lat and bounds.max_lat
       and b.longitude between bounds.min_lng and bounds.max_lng
  ),
  measured as (
    select c.id, c.precision_level,
           2 * 6371 * asin(sqrt(
             power(sin(radians(c.lat - p_lat) / 2), 2) +
             cos(radians(p_lat)) * cos(radians(c.lat)) *
             power(sin(radians(c.lng - p_lng) / 2), 2)
           )) as distance_km
      from candidates c
  )
  select m.id, m.distance_km, m.precision_level
    from measured m
   where m.distance_km <= p_radius_km
   -- Exact before city at the same distance: given two equally near answers,
   -- the one whose position is actually known is the better one.
   order by m.distance_km, (m.precision_level = 'exact') desc
   limit least(greatest(p_limit, 1), 60);
$$;

grant execute on function businesses_near(double precision, double precision, integer, integer)
  to anon, authenticated;

comment on function businesses_near(double precision, double precision, integer, integer) is
  'Approved listings within p_radius_km, nearest first, each with how well its location is known. A "city" precision means the distance orders the result but must not be displayed.';
