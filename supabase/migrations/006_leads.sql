-- ===========================================================================
-- 006 — Leads
--
-- The revenue core. A traveler submits one enquiry; it is scored, then fanned
-- out to a ranked set of matching businesses, each of which tracks its own
-- response independently.
-- ===========================================================================

create table leads (
  id             uuid primary key default gen_random_uuid(),
  -- Human-quotable in support conversations: ET-2026-000123.
  reference      text not null unique,

  -- Null for guest submissions. The quote form must not require an account —
  -- forcing signup before a quote is the fastest way to lose the lead.
  traveler_id    uuid references profiles(id) on delete set null,

  full_name      text not null,
  email          citext not null,
  phone          text,
  whatsapp       text,

  destination_id uuid references destinations(id) on delete set null,
  category_id    uuid references categories(id) on delete set null,
  -- Free-text destination when the traveler names somewhere not yet in the taxonomy.
  destination_other text,

  travel_start   date,
  travel_end     date,
  dates_flexible boolean not null default false,

  adults         smallint not null default 1,
  children       smallint not null default 0,

  budget_min     numeric(12, 2),
  budget_max     numeric(12, 2),
  budget_currency char(3) not null default 'USD',

  interests      text[] not null default '{}',
  message        text,

  -- Which language the traveler wrote in, so businesses know what they are
  -- replying to and we can prefer operators who handle that language.
  locale         text not null default 'en' references locales(code),

  status         lead_status not null default 'new',

  -- 0-100. Drives distribution order and gives premium tiers a concrete benefit:
  -- first access to well-qualified enquiries. Computed in `score_lead` below.
  quality_score  smallint not null default 0,

  -- Attribution, for working out which pages actually earn.
  source_url     text,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  referrer       text,

  -- Retained for abuse handling only.
  ip_address     inet,
  user_agent     text,

  distributed_at timestamptz,
  closed_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint leads_dates_ordered check (travel_end is null or travel_start is null or travel_end >= travel_start),
  constraint leads_budget_ordered check (budget_max is null or budget_min is null or budget_max >= budget_min),
  constraint leads_adults_positive check (adults >= 1),
  constraint leads_children_nonneg check (children >= 0),
  constraint leads_quality_range check (quality_score between 0 and 100),
  constraint leads_email_shape check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index leads_status_idx on leads (status, created_at desc);
create index leads_destination_idx on leads (destination_id);
create index leads_category_idx on leads (category_id);
create index leads_traveler_idx on leads (traveler_id);
create index leads_email_idx on leads (email);
create index leads_created_idx on leads (created_at desc);

create trigger leads_set_updated_at
  before update on leads
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Reference numbers
-- ---------------------------------------------------------------------------
create sequence lead_reference_seq;

create or replace function generate_lead_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null then
    new.reference := 'ET-' || to_char(now(), 'YYYY') || '-' ||
                     lpad(nextval('lead_reference_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger leads_generate_reference
  before insert on leads
  for each row execute function generate_lead_reference();

-- ---------------------------------------------------------------------------
-- Lead quality scoring
--
-- Rewards the signals that actually predict a booking: a real budget, firm
-- dates, a reachable phone number, and enough written detail to quote against.
-- Deliberately simple and inspectable — an opaque score would be impossible for
-- an operator to trust or for us to explain when they ask why they got a lead.
-- ---------------------------------------------------------------------------
create or replace function score_lead(lead leads)
returns smallint
language plpgsql
immutable
as $$
declare
  score integer := 0;
begin
  -- A stated budget is the strongest single signal of intent.
  if lead.budget_min is not null or lead.budget_max is not null then
    score := score + 25;
  end if;

  -- Firm dates beat "sometime next year".
  if lead.travel_start is not null then
    score := score + 15;
    if not lead.dates_flexible then
      score := score + 10;
    end if;
  end if;

  -- A phone or WhatsApp number means the operator can actually close.
  if coalesce(lead.whatsapp, lead.phone) is not null then
    score := score + 15;
  end if;

  -- Enough detail to quote against, rather than "send me prices".
  if length(coalesce(lead.message, '')) >= 120 then
    score := score + 20;
  elsif length(coalesce(lead.message, '')) >= 40 then
    score := score + 10;
  end if;

  if lead.destination_id is not null then
    score := score + 8;
  end if;

  if array_length(lead.interests, 1) > 0 then
    score := score + 7;
  end if;

  return least(score, 100)::smallint;
end;
$$;

create or replace function leads_apply_score()
returns trigger
language plpgsql
as $$
begin
  new.quality_score := score_lead(new);
  return new;
end;
$$;

create trigger leads_score_trigger
  before insert or update on leads
  for each row execute function leads_apply_score();

-- ---------------------------------------------------------------------------
-- Distribution
--
-- One row per business that received the enquiry. This is the table the whole
-- monetization model rests on: it records who got what, in what order, and what
-- they did about it.
-- ---------------------------------------------------------------------------
create table lead_businesses (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references leads(id) on delete cascade,
  business_id  uuid not null references businesses(id) on delete cascade,

  status       lead_business_status not null default 'sent',

  -- Position in the distribution. Rank 1 saw it first, which is exactly what a
  -- premium tier is selling.
  rank         smallint not null default 1,
  -- Why this business matched, kept for tuning and for answering "why did I get this?".
  match_reason jsonb not null default '{}'::jsonb,

  sent_at      timestamptz not null default now(),
  viewed_at    timestamptz,
  responded_at timestamptz,
  -- Denormalized from responded_at - sent_at so response-time stats do not need
  -- a scan; feeds the public "typically replies in ~2 hours" signal.
  response_minutes integer,

  quoted_amount   numeric(12, 2),
  quoted_currency char(3),

  decline_reason text,
  notes          text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- A business must never receive the same enquiry twice.
  unique (lead_id, business_id)
);

create index lead_businesses_business_idx on lead_businesses (business_id, status, sent_at desc);
create index lead_businesses_lead_idx on lead_businesses (lead_id, rank);

create trigger lead_businesses_set_updated_at
  before update on lead_businesses
  for each row execute function set_updated_at();

-- Stamp the response timeline and keep the business's aggregate stats current.
create or replace function lead_businesses_track_response()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'sent' and old.status = 'sent' and new.viewed_at is null then
    new.viewed_at := now();
  end if;

  if new.status in ('responded', 'quoted', 'won')
     and old.status not in ('responded', 'quoted', 'won')
     and new.responded_at is null then
    new.responded_at := now();
    new.response_minutes := greatest(
      0,
      extract(epoch from (now() - new.sent_at))::integer / 60
    );
  end if;

  return new;
end;
$$;

create trigger lead_businesses_track_response_trigger
  before update on lead_businesses
  for each row execute function lead_businesses_track_response();

-- Recompute the business's public responsiveness signals.
create or replace function refresh_business_response_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.business_id, old.business_id);
begin
  update businesses b
  set response_rate = stats.rate,
      avg_response_minutes = stats.avg_minutes
  from (
    select
      round(
        100.0 * count(*) filter (where responded_at is not null) / nullif(count(*), 0),
        2
      ) as rate,
      avg(response_minutes) filter (where response_minutes is not null)::integer as avg_minutes
    from lead_businesses
    where business_id = target
  ) stats
  where b.id = target;

  return null;
end;
$$;

create trigger lead_businesses_refresh_stats
  after insert or update of status on lead_businesses
  for each row execute function refresh_business_response_stats();

-- ---------------------------------------------------------------------------
-- Event log — an append-only trail of what happened to an enquiry.
-- ---------------------------------------------------------------------------
create table lead_events (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  business_id uuid references businesses(id) on delete set null,
  actor_id    uuid references profiles(id) on delete set null,
  event       text not null,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index lead_events_lead_idx on lead_events (lead_id, created_at desc);
