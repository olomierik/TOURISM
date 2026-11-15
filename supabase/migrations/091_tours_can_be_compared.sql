-- ===========================================================================
-- 091 — Tours can be compared
--
-- Owner's call, 14 November 2026: take the direction SafariBookings has
-- taken. Looked at again that day, the thing that site sells is not
-- operators but tours — 14,447 of them, each on a card that answers four
-- questions before the traveller clicks: what it costs, whether the vehicle
-- is shared, how comfortable it is, and where it starts. Its search is built
-- on those answers, and they are its filters.
--
-- A package here could say its price and its length and nothing else. There
-- was also nowhere to search them: /packages/[slug] existed and /packages did
-- not. This migration is the data half of fixing that.
--
-- Four columns, all nullable or defaulted, so the nine packages that exist
-- keep working and simply do not appear under a filter they have not
-- answered. Closed lists rather than free text for the two a traveller
-- filters on — the same reasoning as trip_activity in 074: a free field fills
-- with adjectives, and "mid-range luxury budget" matches every filter.
-- ===========================================================================
begin;

alter table packages
  add column if not exists comfort_level text
    check (comfort_level is null or comfort_level in ('budget', 'midrange', 'luxury')),
  add column if not exists tour_style text
    check (tour_style is null or tour_style in ('private', 'shared')),
  add column if not exists start_city text
    check (start_city is null or char_length(start_city) <= 80),
  add column if not exists is_customizable boolean not null default false;

comment on column packages.comfort_level is
  'Budget, mid-range or luxury, as the operator describes the accommodation and vehicle. Null until the operator says.';
comment on column packages.tour_style is
  'Private (the party has the vehicle to itself) or shared (joins other travellers). The first thing a solo traveller and a family each need to know, for opposite reasons.';
comment on column packages.start_city is
  'Where the tour begins, e.g. Arusha. Free text: it is a town, and the list of towns is not closed.';
comment on column packages.is_customizable is
  'True when the operator will change the itinerary on request.';

commit;
