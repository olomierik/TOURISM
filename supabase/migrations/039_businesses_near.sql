-- ===========================================================================
-- 039 — "What is near me"
--
-- 922 of the 1,329 approved listings carry coordinates and nothing has ever
-- read them except the destination map. Somebody standing in Arusha with a
-- free afternoon cannot ask this site what is around them; they can only
-- browse a category and hope.
--
-- No PostGIS on this database and no earthdistance, so the distance is
-- haversine arithmetic in SQL. That is fine at this size: the bounding-box
-- filter below cuts the candidate set to a few dozen rows before any
-- trigonometry runs, and the index on (latitude, longitude) serves it.
--
-- The function is deliberately coarse about its input. The caller rounds the
-- viewer's position before it leaves the browser, and there is no reason for
-- this to be more precise than that — "within 30km" does not need to know
-- which street somebody is on, and a query log that records it would be a
-- location history nobody asked to keep.
-- ===========================================================================

create index if not exists businesses_coords
  on businesses (latitude, longitude)
  where status = 'approved' and deleted_at is null and latitude is not null;

create or replace function businesses_near(
  p_lat      double precision,
  p_lng      double precision,
  p_radius_km integer default 50,
  p_limit    integer default 24
) returns table (
  id          uuid,
  distance_km double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      -- One degree of latitude is ~111km everywhere. Longitude narrows with
      -- latitude, and the cos() guard keeps the box from collapsing near the
      -- poles — irrelevant in East Africa, wrong to leave out anyway.
      p_lat - (p_radius_km / 111.0)                                        as min_lat,
      p_lat + (p_radius_km / 111.0)                                        as max_lat,
      p_lng - (p_radius_km / greatest(1.0, 111.0 * cos(radians(p_lat))))   as min_lng,
      p_lng + (p_radius_km / greatest(1.0, 111.0 * cos(radians(p_lat))))   as max_lng
  ),
  candidates as (
    select b.id, b.latitude::double precision as lat, b.longitude::double precision as lng
      from businesses b, bounds
     where b.status = 'approved'
       and b.deleted_at is null
       and b.latitude between bounds.min_lat and bounds.max_lat
       and b.longitude between bounds.min_lng and bounds.max_lng
  )
  select c.id,
         -- Haversine, mean earth radius 6371km.
         2 * 6371 * asin(sqrt(
           power(sin(radians(c.lat - p_lat) / 2), 2) +
           cos(radians(p_lat)) * cos(radians(c.lat)) *
           power(sin(radians(c.lng - p_lng) / 2), 2)
         )) as distance_km
    from candidates c
   where 2 * 6371 * asin(sqrt(
           power(sin(radians(c.lat - p_lat) / 2), 2) +
           cos(radians(p_lat)) * cos(radians(c.lat)) *
           power(sin(radians(c.lng - p_lng) / 2), 2)
         )) <= p_radius_km
   order by distance_km
   limit least(greatest(p_limit, 1), 60);
$$;

-- Approved listings are public already; this reads nothing that a directory
-- page does not. security invoker keeps RLS in force regardless.
grant execute on function businesses_near(double precision, double precision, integer, integer)
  to anon, authenticated;

comment on function businesses_near(double precision, double precision, integer, integer) is
  'Approved listings within p_radius_km of a point, nearest first. Haversine in SQL — no PostGIS on this database. Callers round the position before sending it; this needs no more precision than that.';
