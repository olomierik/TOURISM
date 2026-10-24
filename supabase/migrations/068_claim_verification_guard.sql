-- ===========================================================================
-- 068 — Who may mark a claim verified, on insert as well as update
--
-- 026's guard ran only on UPDATE and let only admins through. Two gaps:
--
--   * A claimant could INSERT their claim with verified_at already set. The
--     insert policy checks who is claiming and what, not these columns, so the
--     strongest signal a reviewer has was writable by the person reviewed.
--   * The server marks claims verified with the service role, which has no
--     auth.uid(), so is_admin() is false and 026 refused it. A claimant who
--     filed first and proved the mailbox second never had it recorded.
--
-- The server (no signed-in user: is_trusted_context) and admins may set these
-- columns. A signed-in claimant may not, on either path.
-- ===========================================================================

create or replace function business_claims_guard_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() or is_trusted_context() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.verified_at is not null
       or new.verification_method is not null
       or new.verified_contact is not null then
      raise exception 'Claim verification is set by the server, not by the claimant'
        using errcode = 'insufficient_privilege';
    end if;
  elsif new.verified_at is distinct from old.verified_at
     or new.verification_method is distinct from old.verification_method
     or new.verified_contact is distinct from old.verified_contact then
    raise exception 'Claim verification is set by the server, not by the claimant'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists business_claims_guard_verification_insert on business_claims;
create trigger business_claims_guard_verification_insert
  before insert on business_claims
  for each row execute function business_claims_guard_verification();
