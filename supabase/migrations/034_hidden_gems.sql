-- ===========================================================================
-- 034 — Hidden gems, modelled as alternatives rather than as a listicle
--
-- Forty-six destinations exist. Six of them carry almost every inbound link on
-- this site and the other forty are reachable only by knowing their name:
-- Mahale has eighty operators attached and not one page pointing at it, while
-- Serengeti is linked from the homepage, the planner, four guides and a sitemap
-- entry. That is a discovery problem, and "10 hidden gems" posts do not fix it
-- because they are lists of names with no reason to click any of them.
--
-- The framing that works is the one a traveller actually uses: they already
-- know the famous place, and the question is whether something quieter would
-- suit them better. So a gem here is not a free-floating recommendation, it is
-- an alternative TO something — instead_of_id — which is also how people search
-- ("Serengeti alternative", "less crowded than the Mara").
--
-- The load-bearing field is trade_off. These places are empty for a reason:
-- a charter flight, no tarmac, four lodges, no big cats. A page that lists the
-- upside and hides the cost is an advert, and the reader finds out at the
-- airport. Naming the cost is what separates this from the listicles, and it is
-- required by a constraint rather than left to whoever writes the next row.
--
-- No slug and no page of its own. A gem IS a destination and already has a URL,
-- seasonality, costs, a map and operators. Duplicating that would create two
-- pages competing for one name; this table adds the pitch and the links.
-- ===========================================================================

create table hidden_gems (
  id             uuid primary key default gen_random_uuid(),

  -- The gem is a destination. One row per destination, so a place cannot be
  -- pitched twice with two different reasons.
  destination_id uuid not null unique
                 references destinations(id) on delete cascade,

  -- The well-known place this is offered instead of. Nullable: a few gems
  -- substitute for nothing in particular and stand on their own.
  instead_of_id  uuid references destinations(id) on delete set null,

  sort_order     smallint not null default 100,
  is_active      boolean not null default true,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- "Instead of Serengeti, try Serengeti" is not a recommendation.
  constraint hidden_gems_not_itself check (instead_of_id is distinct from destination_id)
);

create index hidden_gems_instead_of on hidden_gems (instead_of_id) where is_active;
create index hidden_gems_order on hidden_gems (sort_order) where is_active;

-- ---------------------------------------------------------------------------
-- The text. No name and no slug — both belong to the destination, and copying
-- them here would let the two drift apart.
-- ---------------------------------------------------------------------------
create table hidden_gem_translations (
  id            uuid primary key default gen_random_uuid(),
  hidden_gem_id uuid not null references hidden_gems(id) on delete cascade,
  locale        text not null references locales(code),

  -- What you get that the famous place cannot give you.
  pitch         text not null,

  -- What it costs you to take this instead. Required, and required to be
  -- substantial: the honesty is the product, so an empty string or a shrug
  -- like "harder" fails the constraint rather than shipping.
  trade_off     text not null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (hidden_gem_id, locale),
  constraint hidden_gem_pitch_substantial check (length(btrim(pitch)) >= 40),
  constraint hidden_gem_trade_off_substantial check (length(btrim(trade_off)) >= 40)
);

alter table hidden_gems enable row level security;
alter table hidden_gem_translations enable row level security;

create policy hidden_gems_public_read on hidden_gems
  for select to anon, authenticated using (is_active);

create policy hidden_gems_admin_write on hidden_gems
  for all to authenticated using (is_admin()) with check (is_admin());

create policy hidden_gem_translations_public_read on hidden_gem_translations
  for select to anon, authenticated using (true);

create policy hidden_gem_translations_admin_write on hidden_gem_translations
  for all to authenticated using (is_admin()) with check (is_admin());

create trigger hidden_gems_touch
  before update on hidden_gems
  for each row execute function set_updated_at();

create trigger hidden_gem_translations_touch
  before update on hidden_gem_translations
  for each row execute function set_updated_at();

comment on table hidden_gems is
  'Under-visited destinations, each pitched as an alternative to a famous one. No slug: the gem is a destination and already has a page.';
comment on column hidden_gems.instead_of_id is
  'The well-known destination this is offered instead of. Drives the "quieter alternatives" block on that destination page.';
comment on column hidden_gem_translations.trade_off is
  'Why the place is empty. Required — a gem listed without its cost is an advert.';
