-- ===========================================================================
-- 043 — Newsletter subscribers
--
-- The redesign asks for a subscribe box on the homepage and there was no
-- newsletter anywhere in this project, so this is the smallest table that makes
-- the box honest rather than decorative: an address, when it was given, and
-- which language the person was reading in.
--
-- No sending. Resend is configured now, but a campaign nobody has written is
-- not a reason to build a campaign system — the list is exportable, and the
-- first send can be a script when there is something to say. What matters today
-- is that pressing Subscribe records something an admin can act on, which is
-- the difference between a form and a picture of a form.
--
-- Insert-only for the public and admin-only to read, for the same reason the
-- contact table is: a readable list of subscriber addresses is a mailing list
-- anybody can harvest.
-- ===========================================================================

create table newsletter_subscribers (
  email        text primary key,
  locale       text references locales(code),
  -- Where they subscribed from. A homepage signup and a guide-page signup are
  -- different intents, and knowing which is what makes the first campaign
  -- worth writing.
  source       text not null default 'homepage',

  unsubscribed_at timestamptz,
  created_at   timestamptz not null default now(),

  constraint newsletter_email_shape
    check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),
  constraint newsletter_source_shape check (source ~ '^[a-z_-]{1,32}$')
);

create index newsletter_active on newsletter_subscribers (created_at desc)
  where unsubscribed_at is null;

alter table newsletter_subscribers enable row level security;

create policy newsletter_anyone_subscribes on newsletter_subscribers
  for insert to anon, authenticated with check (true);

create policy newsletter_admin_reads on newsletter_subscribers
  for select to authenticated using (is_admin());

create policy newsletter_admin_writes on newsletter_subscribers
  for update to authenticated using (is_admin()) with check (is_admin());

comment on table newsletter_subscribers is
  'Newsletter list. Insert-only for the public and admin-only to read — a readable list of addresses is a mailing list anybody can harvest.';
