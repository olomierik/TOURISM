-- 066 — Structured quotes, one per operator per enquiry.
--
-- An operator's quote used to be whatever they wrote in an email, so a
-- traveller with five replies had five differently shaped answers to compare.
-- A quote here has the same fields from every operator (price, what it
-- covers, how long, until when), so the traveller's page can line them up.
--
-- One row per lead_businesses row; sending again updates it. Writes go
-- through a server action that checks the operator owns the business, so
-- there is no write policy. Reads mirror lead_messages.

create table lead_quotes (
  lead_business_id uuid primary key references lead_businesses(id) on delete cascade,
  total_amount     numeric(12, 2) not null check (total_amount > 0 and total_amount < 10000000),
  currency         char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  price_basis      text not null default 'total' check (price_basis in ('total', 'per_person')),
  duration_days    smallint check (duration_days between 1 and 90),
  valid_until      date,
  includes         text check (char_length(includes) <= 2000),
  excludes         text check (char_length(excludes) <= 2000),
  notes            text check (char_length(notes) <= 2000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger lead_quotes_set_updated_at
  before update on lead_quotes
  for each row execute function set_updated_at();

alter table lead_quotes enable row level security;

create policy lead_quotes_read on lead_quotes
  for select to authenticated
  using (
    exists (
      select 1 from lead_businesses lb
      where lb.id = lead_business_id
        and (owns_business(lb.business_id) or lead_belongs_to_me(lb.lead_id))
    )
    or is_admin()
  );
