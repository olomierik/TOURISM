import type { Enums } from '@/lib/supabase/database.types';

/**
 * Which industry registers the directory may filter by.
 *
 * Moved here from the retired /operator-registers page (2026-11-09), whose
 * listings now live in the directory under a "Member of" filter. The rule it
 * carried comes with it unchanged:
 *
 * TLTO is withheld. The data holds 554 operators absent from the TLTO register
 * and zero listed, while TLTO's own site claims around 31 members — a parser
 * that failed on one register's markup, not a finding about 588 companies. A
 * "TLTO member" filter returning nothing would say the same wrong thing.
 * Remove it from `WithheldRegister` once somebody reads that register directly;
 * the typed message keys (`directory.register_*`) will then demand its five
 * translations before the build passes.
 *
 * And none of these is a licence: membership of a trade association, or a
 * park authority list, is not a government licence (business_registers'
 * table comment, migration 074).
 */
export type OperatorRegister = Enums<'operator_register'>;
export type WithheldRegister = 'tlto';
export type PublishedRegister = Exclude<OperatorRegister, WithheldRegister>;

/** Strongest first. */
export const PUBLISHED_REGISTERS: readonly PublishedRegister[] = ['tato', 'zato', 'kinapa'];

export const isPublishedRegister = (v: string | undefined): v is PublishedRegister =>
  Boolean(v) && (PUBLISHED_REGISTERS as readonly string[]).includes(v as string);
