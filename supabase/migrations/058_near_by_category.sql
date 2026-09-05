-- ===========================================================================
-- 058 — Near me, by category
--
-- The complaint was that near-me only returns tour operators. Measured from
-- Arusha at 50km before changing anything, it returns 24 Safaris, 18 Car
-- Rental, 11 Hotels, 4 Restaurants, 3 Activities and 1 Tour Guide — so it has
-- always returned everything. What it does not do is say so.
--
-- The function takes the nearest 24 of all categories, and in a town whose
-- directory is 565 listings deep in safari operators, the nearest 24 are
-- overwhelmingly safari operators. A reader looking for somewhere to eat sees
-- a screen of tour companies and concludes, reasonably, that this is a tour
-- company finder.
--
-- Two changes, and the second is the one that matters.
--
-- businesses_near takes an optional category, so asking for restaurants
-- searches every restaurant in the radius instead of filtering the 24 nearest
-- of everything — which would have returned two restaurants and looked like
-- there are only two.
--
-- categories_near is new and reports how many of each category lie in the
-- radius. That is what lets the page show 'Hotels (11)' beside 'Safaris (24)'
-- before anybody filters. A filter the reader has to guess at does not fix a
-- problem of the reader not knowing the options are there.
-- ===========================================================================

-- The return columns are unchanged; the signature is not, so this is a drop
-- and create. PostgREST calls by parameter name, so an optional new argument
-- does not break any existing caller.
drop function if exists businesses_near(double precision, double precision, integer, integer);

create function businesses_near(
  p_lat       double precision,
  p_lng       double precision,
  p_radius_km integer default 50,
  p_limit     integer default 24,
  p_category  uuid default null
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
       -- exists rather than a join: a business can sit in several categories,
       -- and a join would return it once per match and let a listing outrank
       -- itself in the nearest 24.
       and (
         p_category is null
         or exists (
           select 1 from business_categories bc
            where bc.business_id = b.id and bc.category_id = p_category
         )
       )
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

grant execute on function businesses_near(double precision, double precision, integer, integer, uuid)
  to anon, authenticated;

comment on function businesses_near(double precision, double precision, integer, integer, uuid) is
  'Approved listings within p_radius_km, nearest first, each with how well its location is known. A "city" precision means the distance orders the result but must not be displayed. p_category null means every category.';

-- ---------------------------------------------------------------------------
-- What is around here, by kind.
--
-- Deliberately not limited and deliberately not ordered by distance: this
-- answers "what sort of thing is near me", and the honest answer counts every
-- match in the radius rather than whatever survived a top-24 cut.
-- ---------------------------------------------------------------------------
create or replace function categories_near(
  p_lat       double precision,
  p_lng       double precision,
  p_radius_km integer default 50
) returns table (
  category_id uuid,
  n           bigint
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
  within as (
    select b.id
      from businesses b, bounds
     where b.status = 'approved'
       and b.deleted_at is null
       and b.latitude between bounds.min_lat and bounds.max_lat
       and b.longitude between bounds.min_lng and bounds.max_lng
       -- The bounding box is a square and the radius is a circle. Without this
       -- the corners leak in, and a count that disagrees with the list under it
       -- is worse than no count.
       and 2 * 6371 * asin(sqrt(
             power(sin(radians(b.latitude::double precision - p_lat) / 2), 2) +
             cos(radians(p_lat)) * cos(radians(b.latitude::double precision)) *
             power(sin(radians(b.longitude::double precision - p_lng) / 2), 2)
           )) <= p_radius_km
  )
  select bc.category_id, count(distinct bc.business_id) as n
    from business_categories bc
    join within w on w.id = bc.business_id
   group by bc.category_id
   order by n desc;
$$;

grant execute on function categories_near(double precision, double precision, integer)
  to anon, authenticated;

comment on function categories_near(double precision, double precision, integer) is
  'How many approved listings of each category lie within p_radius_km of a point. Feeds the category chips on near-me so a reader can see that hotels and restaurants are there before filtering for them.';
