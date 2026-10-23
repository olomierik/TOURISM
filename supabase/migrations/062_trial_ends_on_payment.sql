-- ===========================================================================
-- 062 — Paying during a trial ends the trial
--
-- The brief lets an owner subscribe at any time during their trial. Every paid
-- path (grant_annual_plan after a bank transfer, the Flutterwave webhook)
-- extends the business's single active subscription row in place, which is the
-- trial row while one is running. Those paths set provider to the payment
-- method; they do not know about is_trial, and should not have to.
--
-- So the rule lives here: once a row's provider is anything but 'trial', it is
-- a paid period, not a trial. Paying early keeps the remaining trial days:
-- grant_annual_plan extends from whichever is later, now or the current end.
-- ===========================================================================

create or replace function subscriptions_clear_trial_on_payment()
returns trigger
language plpgsql
as $$
begin
  if new.is_trial and new.provider is distinct from 'trial' then
    new.is_trial := false;
  end if;
  return new;
end;
$$;

create trigger subscriptions_clear_trial_on_payment
  before update on subscriptions
  for each row execute function subscriptions_clear_trial_on_payment();
