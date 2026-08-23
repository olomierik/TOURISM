-- ===========================================================================
-- 023 — Countries and regions
--
-- Opens the directory beyond Tanzania. Two reference tables rather than free
-- text or a TypeScript constant:
--
--   countries — every African country, so an operator anywhere on the continent
--               can list a business. A flag marks the ones we actually curate
--               destinations for, because listing a business in a country and
--               editorially covering that country are different commitments and
--               will not expand at the same rate.
--
--   regions   — the administrative regions of the curated countries, so adding
--               a destination is a choice from a list rather than a typed
--               string that will be spelled four different ways within a month.
--
-- As data, not code: adding Zambia later is a seed, not a deploy.
-- ===========================================================================

create table if not exists countries (
  code       char(2) primary key,
  name       text not null,
  -- Whether admins may create destinations here. Every African country is
  -- listable by a business; only these are editorially covered.
  supports_destinations boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists regions (
  id           uuid primary key default gen_random_uuid(),
  country_code char(2) not null references countries(code) on delete cascade,
  name         text not null,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  unique (country_code, name)
);

create index if not exists regions_country_idx on regions (country_code, sort_order, name);

-- ---------------------------------------------------------------------------
-- Attach the taxonomy to the tables that need it.
--
-- Defaulting to TZ is correct for the backfill: every row that exists today is
-- Tanzanian, and this site launched as a Tanzania directory.
-- ---------------------------------------------------------------------------
alter table destinations add column if not exists country_code char(2)
  references countries(code);
alter table destinations add column if not exists region_id uuid
  references regions(id) on delete set null;

alter table businesses add column if not exists country_code char(2)
  references countries(code);

-- ---------------------------------------------------------------------------
-- Countries. Every member state of the African Union plus Morocco, which is
-- what "the African continent" means to someone listing a business.
-- ---------------------------------------------------------------------------
insert into countries (code, name, supports_destinations, sort_order) values
  ('TZ', 'Tanzania', true, 1),
  ('KE', 'Kenya', true, 2),
  ('UG', 'Uganda', true, 3),
  ('RW', 'Rwanda', true, 4),
  ('DZ', 'Algeria', false, 100),
  ('AO', 'Angola', false, 100),
  ('BJ', 'Benin', false, 100),
  ('BW', 'Botswana', false, 100),
  ('BF', 'Burkina Faso', false, 100),
  ('BI', 'Burundi', false, 100),
  ('CV', 'Cabo Verde', false, 100),
  ('CM', 'Cameroon', false, 100),
  ('CF', 'Central African Republic', false, 100),
  ('TD', 'Chad', false, 100),
  ('KM', 'Comoros', false, 100),
  ('CG', 'Congo', false, 100),
  ('CD', 'Congo (DRC)', false, 100),
  ('CI', 'Côte d''Ivoire', false, 100),
  ('DJ', 'Djibouti', false, 100),
  ('EG', 'Egypt', false, 100),
  ('GQ', 'Equatorial Guinea', false, 100),
  ('ER', 'Eritrea', false, 100),
  ('SZ', 'Eswatini', false, 100),
  ('ET', 'Ethiopia', false, 100),
  ('GA', 'Gabon', false, 100),
  ('GM', 'Gambia', false, 100),
  ('GH', 'Ghana', false, 100),
  ('GN', 'Guinea', false, 100),
  ('GW', 'Guinea-Bissau', false, 100),
  ('LS', 'Lesotho', false, 100),
  ('LR', 'Liberia', false, 100),
  ('LY', 'Libya', false, 100),
  ('MG', 'Madagascar', false, 100),
  ('MW', 'Malawi', false, 100),
  ('ML', 'Mali', false, 100),
  ('MR', 'Mauritania', false, 100),
  ('MU', 'Mauritius', false, 100),
  ('MA', 'Morocco', false, 100),
  ('MZ', 'Mozambique', false, 100),
  ('NA', 'Namibia', false, 100),
  ('NE', 'Niger', false, 100),
  ('NG', 'Nigeria', false, 100),
  ('ST', 'São Tomé and Príncipe', false, 100),
  ('SN', 'Senegal', false, 100),
  ('SC', 'Seychelles', false, 100),
  ('SL', 'Sierra Leone', false, 100),
  ('SO', 'Somalia', false, 100),
  ('ZA', 'South Africa', false, 100),
  ('SS', 'South Sudan', false, 100),
  ('SD', 'Sudan', false, 100),
  ('TG', 'Togo', false, 100),
  ('TN', 'Tunisia', false, 100),
  ('ZM', 'Zambia', false, 100),
  ('ZW', 'Zimbabwe', false, 100)
on conflict (code) do update
  set name = excluded.name,
      supports_destinations = excluded.supports_destinations,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Regions of the curated countries.
--
-- Official administrative divisions: Tanzania's regions, Kenya's counties,
-- Uganda's regions, Rwanda's provinces. Using the official set rather than a
-- hand-picked list of tourist areas means the picker stays correct as coverage
-- grows, and a destination always sits somewhere a reader can place on a map.
-- ---------------------------------------------------------------------------
insert into regions (country_code, name) values
  -- Tanzania (31 regions)
  ('TZ','Arusha'),('TZ','Dar es Salaam'),('TZ','Dodoma'),('TZ','Geita'),
  ('TZ','Iringa'),('TZ','Kagera'),('TZ','Katavi'),('TZ','Kigoma'),
  ('TZ','Kilimanjaro'),('TZ','Lindi'),('TZ','Manyara'),('TZ','Mara'),
  ('TZ','Mbeya'),('TZ','Mjini Magharibi'),('TZ','Morogoro'),('TZ','Mtwara'),
  ('TZ','Mwanza'),('TZ','Njombe'),('TZ','Pemba North'),('TZ','Pemba South'),
  ('TZ','Pwani'),('TZ','Rukwa'),('TZ','Ruvuma'),('TZ','Shinyanga'),
  ('TZ','Simiyu'),('TZ','Singida'),('TZ','Songwe'),('TZ','Tabora'),
  ('TZ','Tanga'),('TZ','Zanzibar North'),('TZ','Zanzibar Central/South'),
  -- Kenya (47 counties)
  ('KE','Baringo'),('KE','Bomet'),('KE','Bungoma'),('KE','Busia'),
  ('KE','Elgeyo-Marakwet'),('KE','Embu'),('KE','Garissa'),('KE','Homa Bay'),
  ('KE','Isiolo'),('KE','Kajiado'),('KE','Kakamega'),('KE','Kericho'),
  ('KE','Kiambu'),('KE','Kilifi'),('KE','Kirinyaga'),('KE','Kisii'),
  ('KE','Kisumu'),('KE','Kitui'),('KE','Kwale'),('KE','Laikipia'),
  ('KE','Lamu'),('KE','Machakos'),('KE','Makueni'),('KE','Mandera'),
  ('KE','Marsabit'),('KE','Meru'),('KE','Migori'),('KE','Mombasa'),
  ('KE','Murang''a'),('KE','Nairobi'),('KE','Nakuru'),('KE','Nandi'),
  ('KE','Narok'),('KE','Nyamira'),('KE','Nyandarua'),('KE','Nyeri'),
  ('KE','Samburu'),('KE','Siaya'),('KE','Taita-Taveta'),('KE','Tana River'),
  ('KE','Tharaka-Nithi'),('KE','Trans Nzoia'),('KE','Turkana'),
  ('KE','Uasin Gishu'),('KE','Vihiga'),('KE','Wajir'),('KE','West Pokot'),
  -- Uganda (4 regions)
  ('UG','Central'),('UG','Eastern'),('UG','Northern'),('UG','Western'),
  -- Rwanda (5 provinces)
  ('RW','Kigali'),('RW','Eastern Province'),('RW','Northern Province'),
  ('RW','Southern Province'),('RW','Western Province')
on conflict (country_code, name) do nothing;

-- ---------------------------------------------------------------------------
-- Backfill. Everything that exists today is Tanzanian.
-- ---------------------------------------------------------------------------
update destinations set country_code = 'TZ' where country_code is null;
update businesses   set country_code = 'TZ' where country_code is null;

alter table destinations alter column country_code set default 'TZ';
alter table businesses   alter column country_code set default 'TZ';

-- ---------------------------------------------------------------------------
-- RLS
--
-- Both tables are public reference data — a visitor needs the country name to
-- read a destination card, and a registering operator needs the list to pick
-- from. Writes are admin-only: these are the vocabulary the rest of the site is
-- categorised by, and a business owner inventing a country would fragment it.
-- ---------------------------------------------------------------------------
alter table countries enable row level security;
alter table regions   enable row level security;

drop policy if exists countries_read on countries;
create policy countries_read on countries
  for select to anon, authenticated using (true);
drop policy if exists countries_admin on countries;
create policy countries_admin on countries
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists regions_read on regions;
create policy regions_read on regions
  for select to anon, authenticated using (true);
drop policy if exists regions_admin on regions;
create policy regions_admin on regions
  for all to authenticated using (is_admin()) with check (is_admin());

create index if not exists destinations_country_idx
  on destinations (country_code, sort_order) where deleted_at is null;
create index if not exists businesses_country_idx
  on businesses (country_code) where deleted_at is null;
