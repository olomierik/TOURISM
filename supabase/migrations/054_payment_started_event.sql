-- ===========================================================================
-- 054 — 'payment_started' as an analytics event
--
-- analytics_events.event is an enum, so a value the type does not know is
-- rejected by the database rather than stored as an unrecognised string. The
-- client would have fired the event, the insert would have failed, and the
-- funnel would have shown nobody ever pressing pay — which is worse than no
-- data, because it reads as a feature nobody uses.
--
-- Named for what it records. A traveller followed an operator's own checkout
-- link; whether they then paid happens on the provider's servers under the
-- operator's account, and nothing reports back here.
--
-- Postgres 12 and later allow ADD VALUE inside a transaction as long as the new
-- value is not used in the same transaction. Nothing below uses it, so this is
-- safe under the migration runner, which wraps every file in one.
-- ===========================================================================

alter type analytics_event add value if not exists 'payment_started';
