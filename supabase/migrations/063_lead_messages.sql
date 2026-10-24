-- 063 — Messages between a traveller and each operator an enquiry went to.
--
-- Operators answered enquiries by email, so the conversation left the site:
-- reply times were only what operators reported, and nothing tied a review to
-- a real exchange. One thread per lead_businesses row (one per operator), so
-- each operator's conversation with the traveller stays separate.
--
-- Writes go through server actions on the service role after an explicit
-- check (owner of the business, the signed-in traveller, or a guest holding
-- the enquiry's access token), so there is no insert policy here. Reads are
-- open to the same people through RLS, mirroring lead_businesses_read.

create table lead_messages (
  id               uuid primary key default gen_random_uuid(),
  lead_business_id uuid not null references lead_businesses(id) on delete cascade,
  sender           text not null check (sender in ('traveler', 'operator')),
  -- Who wrote it when signed in; null for a guest traveller.
  sender_profile_id uuid references profiles(id) on delete set null,
  body             text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at       timestamptz not null default now(),
  -- When the other side first saw it.
  read_at          timestamptz
);

create index lead_messages_thread_idx on lead_messages (lead_business_id, created_at);

alter table lead_messages enable row level security;

create policy lead_messages_read on lead_messages
  for select to authenticated
  using (
    exists (
      select 1 from lead_businesses lb
      where lb.id = lead_business_id
        and (owns_business(lb.business_id) or lead_belongs_to_me(lb.lead_id))
    )
    or is_admin()
  );

-- A traveller who sent an enquiry without an account opens the conversation
-- from the link in their emails. The token is that link's key: random, never
-- shown on the site, and only ever compared on the server.
alter table leads
  add column access_token uuid not null default gen_random_uuid();

create unique index leads_access_token_idx on leads (access_token);
