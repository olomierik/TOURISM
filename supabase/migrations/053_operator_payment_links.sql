-- ===========================================================================
-- 053 — Operators take their own payments
--
-- Travellers can now pay an operator directly, through that operator's own
-- checkout. The platform never touches the money.
--
-- That distinction is the whole design. Collecting payment and remitting it
-- would make this site a payment facilitator: Bank of Tanzania licensing for
-- handling third-party funds, PCI-DSS scope, KYC on every operator, and
-- ownership of every chargeback and refund. Sending the traveller to the
-- operator's own hosted checkout keeps the merchant relationship where it
-- already is — with the operator, who has the licence, the bank account and
-- the liability.
--
-- What this can therefore record, and what it cannot:
--
--   It can record that a traveller was sent to pay, and where from.
--   It cannot record that they paid. The transaction happens on the provider's
--   servers under the operator's account, and nothing reports back.
--
-- The table below is named for what it holds. Calling it `payments` would
-- invite somebody to sum a column and quote it as revenue, and it is not
-- revenue — it is intent. A referral is a click, and only some fraction of
-- clicks become bookings.
-- ===========================================================================

create type payment_provider as enum (
  'dpo',          -- DPO Group / DirectPay Online — the dominant card gateway in TZ and KE
  'flutterwave',  -- cards plus M-Pesa, Tigo Pesa, Airtel Money
  'pesapal',      -- widely used in Kenya and Tanzania
  'selcom',       -- Tanzanian aggregator, strong on mobile money
  'stripe',       -- for operators selling to Europe and the US
  'paypal'
);

-- ---------------------------------------------------------------------------
-- Where each provider's hosted checkout actually lives.
--
-- An operator pastes a URL and travellers are sent to it, which makes this
-- field a redirect on a site people are about to hand card details to. Left
-- open, a compromised or dishonest operator account turns a tourism directory
-- into a credible phishing funnel: the traveller arrives from a site they were
-- given reason to trust, expecting to pay.
--
-- So a link must live on a host its own provider actually serves checkouts
-- from. An operator whose gateway is not listed here cannot self-serve, and
-- that is deliberate — a human should look at the exception rather than the
-- check being loosened for everyone.
-- ---------------------------------------------------------------------------
create table payment_provider_hosts (
  provider payment_provider not null,
  host     text not null,
  primary key (provider, host)
);

insert into payment_provider_hosts (provider, host) values
  ('dpo',         'secure.3gdirectpay.com'),
  ('dpo',         'paynow.dpogroup.com'),
  ('dpo',         'secure.dpopay.com'),
  ('flutterwave', 'flutterwave.com'),
  ('flutterwave', 'checkout.flutterwave.com'),
  ('flutterwave', 'sandbox-pay.flutterwave.com'),
  ('pesapal',     'pay.pesapal.com'),
  ('pesapal',     'store.pesapal.com'),
  ('selcom',      'checkout.selcommobile.com'),
  ('selcom',      'pay.selcom.net'),
  ('stripe',      'buy.stripe.com'),
  ('stripe',      'checkout.stripe.com'),
  ('paypal',      'paypal.com'),
  ('paypal',      'www.paypal.com'),
  ('paypal',      'paypal.me');

comment on table payment_provider_hosts is
  'Hosts each payment provider serves checkouts from. A checkout URL is validated against this so an operator cannot point travellers at an arbitrary site.';

-- ---------------------------------------------------------------------------

create table business_payment_methods (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses (id) on delete cascade,
  provider     payment_provider not null,
  checkout_url text not null,
  -- What the button should say, when "Book now" is not the truth: some
  -- operators take a deposit, some quote first and take payment afterwards.
  label        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- https only. A checkout reached over http is one a network can rewrite.
  constraint payment_method_https check (checkout_url ~* '^https://'),
  constraint payment_method_url_length check (char_length(checkout_url) between 12 and 500),
  -- One entry per provider per business. Two DPO links is a mistake rather
  -- than a feature, and a traveller would have no way to choose between them.
  unique (business_id, provider)
);

create index business_payment_methods_business_idx
  on business_payment_methods (business_id) where is_active;

comment on table business_payment_methods is
  'An operator own hosted checkout. The platform links to it and never handles the payment: the merchant account, the licence and the chargebacks belong to the operator.';

-- ---------------------------------------------------------------------------
-- Rejects a checkout URL whose host is not one the chosen provider serves.
--
-- A trigger rather than a check constraint because the rule depends on another
-- table, and a trigger rather than application code because the application is
-- not the only thing that writes here: an admin fixing a listing by hand should
-- meet the same rule as the operator who submitted it.
-- ---------------------------------------------------------------------------
create or replace function payment_method_guard() returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  v_host text;
begin
  -- Everything between the scheme and the next / ? or #, lowercased, with any
  -- port and userinfo removed. Userinfo matters: https://paypal.com@evil.test
  -- has a host of evil.test and reads to a person as PayPal.
  v_host := lower(regexp_replace(new.checkout_url, '^https://', '', 'i'));
  v_host := split_part(v_host, '/', 1);
  v_host := split_part(v_host, '?', 1);
  v_host := split_part(v_host, '#', 1);

  if position('@' in v_host) > 0 then
    raise exception 'a checkout URL must not carry credentials'
      using errcode = 'check_violation';
  end if;

  v_host := split_part(v_host, ':', 1);

  if not exists (
    select 1 from payment_provider_hosts h
     where h.provider = new.provider and h.host = v_host
  ) then
    raise exception 'checkout host % is not one % serves checkouts from', v_host, new.provider
      using errcode = 'check_violation';
  end if;

  new.updated_at := now();
  return new;
end;
$fn$;

create trigger business_payment_methods_guard
  before insert or update on business_payment_methods
  for each row execute function payment_method_guard();

-- ---------------------------------------------------------------------------
-- A traveller sent to an operator's checkout.
--
-- Intent, not revenue. Nothing here says a payment happened, because nothing
-- tells us: the transaction is on the provider's servers under the operator's
-- account. Recorded so an admin can see whether the feature is used at all,
-- and which operators and packages send people to pay.
-- ---------------------------------------------------------------------------
create table payment_referrals (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references businesses (id) on delete cascade,
  payment_method_id uuid references business_payment_methods (id) on delete set null,
  package_id        uuid references packages (id) on delete set null,
  provider          payment_provider not null,
  locale            text,
  -- No IP address and no visitor hash. This says a traveller went to pay an
  -- operator, which is enough to know whether the feature works, and personal
  -- data about somebody's payment journey is worth holding only if it is used.
  created_at        timestamptz not null default now()
);

create index payment_referrals_business_idx on payment_referrals (business_id, created_at desc);
create index payment_referrals_created_idx on payment_referrals (created_at desc);

comment on table payment_referrals is
  'A traveller was sent to an operator checkout. Intent, never a completed payment: the transaction happens off-platform and nothing reports back.';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table payment_provider_hosts    enable row level security;
alter table business_payment_methods  enable row level security;
alter table payment_referrals         enable row level security;

-- The host list is read to render the form's help text. It is public knowledge.
create policy payment_hosts_readable on payment_provider_hosts
  for select using (true);

-- A traveller must be able to read an active method to be shown the button.
create policy payment_methods_public_read on business_payment_methods
  for select using (
    is_active and exists (
      select 1 from businesses b
       where b.id = business_id and b.status = 'approved' and b.deleted_at is null
    )
  );

create policy payment_methods_owner_all on business_payment_methods
  for all using (
    exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

create policy payment_methods_admin_all on business_payment_methods
  for all using (is_admin()) with check (is_admin());

-- Referrals are written by anybody following the button, including guests, and
-- read by nobody except the operator they concern and an admin. Insert-only for
-- the public: a visitor can say "I went to pay" and cannot read who else did.
create policy payment_referrals_insert on payment_referrals
  for insert with check (true);

create policy payment_referrals_owner_read on payment_referrals
  for select using (
    exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

create policy payment_referrals_admin_read on payment_referrals
  for select using (is_admin());
