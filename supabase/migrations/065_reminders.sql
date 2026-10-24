-- 065 — Bookkeeping for reminder emails (app/api/cron/reminders).
--
-- Each column records that one reminder went out, so the hourly job sends it
-- at most once:
--   lead_businesses.nudged_at          operator: an enquiry still unanswered
--   lead_businesses.review_reminded_at traveller: review after the trip
--   leads.followup_sent_at             traveller: "did you hear back?"
--   subscriptions.trial_reminder_days  operator: smallest "trial ends in N
--                                      days" bucket already sent (14/7/3/1)

alter table lead_businesses
  add column if not exists nudged_at timestamptz,
  add column if not exists review_reminded_at timestamptz;

alter table leads
  add column if not exists followup_sent_at timestamptz;

alter table subscriptions
  add column if not exists trial_reminder_days smallint;

-- The job's scans: recent unanswered enquiries, won ones, recent leads,
-- active trials.
create index if not exists lead_businesses_nudge_idx
  on lead_businesses (sent_at)
  where nudged_at is null and status in ('sent', 'viewed');

create index if not exists leads_followup_idx
  on leads (created_at)
  where followup_sent_at is null;

create index if not exists subscriptions_trial_idx
  on subscriptions (current_period_end)
  where is_trial and status = 'active';
