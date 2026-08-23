-- ===========================================================================
-- 018 — Make the lead reference a column default rather than a trigger
--
-- `reference` is NOT NULL with no default, filled by a BEFORE INSERT trigger.
-- That works at runtime but is invisible to anything reading the catalog: the
-- generated TypeScript marks it required on insert, so every caller has to
-- either supply a reference (defeating the point) or cast the payload.
--
-- A column default expresses the same intent in a way the schema can actually
-- report. The trigger stays as a safety net for the case where a caller passes
-- an explicit null.
-- ===========================================================================

alter table leads
  alter column reference
  set default 'ET-' || to_char(now(), 'YYYY') || '-' ||
              lpad(nextval('lead_reference_seq')::text, 6, '0');
