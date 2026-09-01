-- ===========================================================================
-- 049 — One spelling per town
--
-- 048 normalised the casing of the eight towns that postal_regions covers, and
-- left everything else alone. That was a half-measure: 'Masaka' and 'MASAKA'
-- are still two entries in the same filter list, two headings on two directory
-- pages, and two different-looking answers to the same question.
--
-- The rule here is deliberately not initcap(). initcap turns 'Dar es Salaam'
-- into 'Dar Es Salaam', which is not how anybody writes it — a formatting
-- function does not know which words are names. So each group keeps the form
-- its own listings most often use, and only the minority spellings move. Where
-- two forms are equally common the shorter wins, which prefers 'Tanga' over
-- 'TANGA' and is at least deterministic rather than whatever order the planner
-- felt like.
-- ===========================================================================

with ranked as (
  select city,
         lower(btrim(city)) as key,
         count(*) as n,
         row_number() over (
           partition by lower(btrim(city))
           order by count(*) desc, length(city), city
         ) as rank
    from businesses
   where deleted_at is null and city is not null
   group by city
),
canonical as (
  select key, city from ranked where rank = 1
)
update businesses b
   set city = canonical.city
  from canonical
 where lower(btrim(b.city)) = canonical.key
   and b.city <> canonical.city;
