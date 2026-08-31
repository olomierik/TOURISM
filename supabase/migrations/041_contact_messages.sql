-- ===========================================================================
-- 041 — Contact messages
--
-- The contact page has been a placeholder saying "this section is being built"
-- while sitting in the sitemap and the footer. Replacing it needs somewhere for
-- a message to go, and the bar for that is higher than it looks: a contact form
-- that writes rows nobody reads is worse than an email address, because it
-- gives the sender a confirmation screen and then silence.
--
-- So this table exists alongside an admin page that lists it. Nothing is
-- published, nothing is emailed — the loop is form → table → admin inbox, which
-- is a loop that closes without depending on an email provider this project
-- does not yet have keys for.
--
-- Most people arriving at a contact page on a travel directory want one of two
-- things that already work better elsewhere: a traveller wants a quote, and an
-- operator wants to claim their listing. The page routes both of those away
-- before offering this form, so what lands here is the genuine remainder.
-- ===========================================================================

create type contact_topic as enum (
  'general',
  'correction',   -- something on a listing or a destination page is wrong
  'takedown',     -- remove my business, or my review
  'privacy',      -- a data request, which the privacy page points here for
  'press',
  'bug'
);

create table contact_messages (
  id         uuid primary key default gen_random_uuid(),

  topic      contact_topic not null default 'general',
  name       text not null,
  email      text not null,
  message    text not null,

  -- Which page they were on. A correction report without it means an admin has
  -- to work out which of 1,329 listings is wrong from prose.
  source_url text,
  locale     text references locales(code),

  -- Admin workflow, deliberately minimal: read or not, and a note.
  handled_at timestamptz,
  handled_by uuid references profiles(id) on delete set null,
  admin_note text,

  created_at timestamptz not null default now(),

  constraint contact_name_length check (length(btrim(name)) between 2 and 80),
  constraint contact_email_shape check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),
  -- Long enough to be a message. A contact form that accepts "hi" collects
  -- nothing an admin can act on and everything a bot wants to send.
  constraint contact_message_length check (length(btrim(message)) between 20 and 4000),
  constraint contact_note_length check (admin_note is null or length(admin_note) <= 2000)
);

create index contact_messages_unhandled
  on contact_messages (created_at desc) where handled_at is null;
create index contact_messages_recent on contact_messages (created_at desc);

-- Rate limiting leans on this: the same address cannot flood the table.
create index contact_messages_by_email on contact_messages (email, created_at desc);

alter table contact_messages enable row level security;

-- Anyone may write; nobody but an admin may read. A public read policy here
-- would publish the email address of everyone who ever used the form.
create policy contact_messages_anyone_writes on contact_messages
  for insert to anon, authenticated with check (true);

create policy contact_messages_admin_reads on contact_messages
  for select to authenticated using (is_admin());

create policy contact_messages_admin_updates on contact_messages
  for update to authenticated using (is_admin()) with check (is_admin());

comment on table contact_messages is
  'Messages from the contact form. Insert-only for the public, admin-only to read — a public select policy would expose every sender''s email address.';
