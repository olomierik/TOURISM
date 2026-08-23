-- ===========================================================================
-- 017 — Restrict privileged functions to the service role
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default, and Supabase
-- exposes every public-schema function over PostgREST as an RPC endpoint. That
-- combination means match_lead_to_businesses — a security definer function that
-- decides which operators receive an enquiry — was callable by any anonymous
-- visitor with the publishable key.
--
-- The distribution logic already refuses to double-send, so the exposure was not
-- catastrophic, but "who receives this lead" is the single most commercially
-- sensitive decision the platform makes and it must not be reachable from a
-- browser. It is now invoked only from server actions holding the secret key.
-- ===========================================================================

revoke execute on function match_lead_to_businesses(uuid) from public, anon, authenticated;
grant  execute on function match_lead_to_businesses(uuid) to service_role;

revoke execute on function business_has_lead_capacity(uuid) from public, anon, authenticated;
grant  execute on function business_has_lead_capacity(uuid) to service_role;

revoke execute on function lead_credit_balance(uuid) from public, anon, authenticated;
grant  execute on function lead_credit_balance(uuid) to service_role;

-- score_lead is deliberately left readable: it is pure, takes a row as input and
-- reveals nothing an operator could exploit. Being able to explain how a lead was
-- scored is a feature, not a leak.

-- The role helpers are used inside RLS policies, which evaluate as the calling
-- user, so they must stay executable by the roles those policies apply to.
-- They are security definer with a pinned search_path and read nothing beyond
-- the caller's own profile row.
grant execute on function is_admin() to anon, authenticated;
grant execute on function current_role_is(user_role) to anon, authenticated;
grant execute on function owns_business(uuid) to anon, authenticated;
grant execute on function business_is_public(uuid) to anon, authenticated;
grant execute on function package_is_public(uuid) to anon, authenticated;
grant execute on function owns_package(uuid) to anon, authenticated;
grant execute on function is_trusted_context() to anon, authenticated;

-- Search helper is called from the app; harmless and needs to stay public.
grant execute on function build_search_query(text, text) to anon, authenticated;
