import { cache } from 'react';

import { createPublicClient } from '@/lib/supabase/public';
import type { Enums } from '@/lib/supabase/database.types';

export type OperatorRegister = Enums<'operator_register'>;

/**
 * The public register page.
 *
 * docs/bookings-and-visibility.md §6b calls this "the strongest card in the
 * deck": Tanzania requires a TALA licence, the ministry's own operator list at
 * maliasili.go.tz broke and was never fixed, and so nobody can check one. The
 * doc's design was "a public page per verified operator, and one index: the
 * licence number, the category it was issued in, the date it was checked, by
 * whom, and against what source".
 *
 * Two facts in the data make that design impossible to ship as written, and
 * pretending otherwise would repeat the badge overclaim that migration 079
 * just finished undoing:
 *
 *  1. `source_url` is null on all 1,924 rows. We did not read TATO, ZATO or
 *     KINAPA. We read tanzaniaoperators.com, which compiles them, and
 *     `checked_on` is the *compiler's* check date, not ours — which is why the
 *     dates run from January to October 2026 rather than clustering on the
 *     import date.
 *  2. Trade-association membership is not a government licence, and the park
 *     authority's list is not one either. Of the 17 licence numbers in the
 *     whole approved table, we have checked exactly zero against an issuing
 *     authority (`license_checked_at`, 079).
 *
 * So this is not a licence register and the page does not call itself one. It
 * publishes what was read, from where, on what date, and — the part no
 * competitor offers — which registers an operator was looked for on and **not**
 * found on. Second-hand and labelled as such is worth something; first-hand and
 * claimed falsely is worth less than nothing.
 */

/**
 * TLTO is withheld from the public page.
 *
 * The data holds 554 operators absent from the TLTO register and **zero**
 * listed, while TLTO's own site claims around 31 members. Zero of 588 is not a
 * finding about 588 businesses, it is a parser that failed on one register's
 * markup. Publishing 554 "not on the TLTO register" statements about named
 * companies on the strength of that would be both wrong and the kind of wrong
 * that attracts a letter.
 *
 * It stays in the database, where migration 074 recorded it, and out of the
 * page until somebody reads the TLTO register directly. Remove it from here
 * when they have.
 */
export type WithheldRegister = 'tlto';

/**
 * Withheld as a *type*, not just a runtime filter.
 *
 * The page labels registers with `t('register.' + r)`, and no copy exists for a
 * withheld one in any of the five locales. Typing the published set as an
 * Exclude makes next-intl's typed keys enforce that: publishing TLTO means
 * deleting it from `WithheldRegister`, which makes tsc demand the five
 * translations before the build goes through. A runtime-only filter would have
 * let a future edit put an unlabelled register on a public page.
 */
export type PublishedRegister = Exclude<OperatorRegister, WithheldRegister>;

export const WITHHELD_REGISTERS: readonly WithheldRegister[] = ['tlto'];

/** Strongest first, matching getOperatorFacts. */
const REGISTER_ORDER: OperatorRegister[] = ['tato', 'tlto', 'zato', 'kinapa'];

const isPublished = (r: OperatorRegister): r is PublishedRegister =>
  !(WITHHELD_REGISTERS as readonly OperatorRegister[]).includes(r);

export const PUBLISHED_REGISTERS: PublishedRegister[] = REGISTER_ORDER.filter(isPublished);

export const PER_PAGE = 100;

export type RegisterTally = {
  register: PublishedRegister;
  listed: number;
  absent: number;
  /** The compiler's earliest and latest check date for this register. */
  from: string | null;
  to: string | null;
};

export type RegisterRow = {
  slug: string;
  name: string;
  listedOn: PublishedRegister[];
  absentFrom: PublishedRegister[];
  /** Most recent check date across this operator's published rows. */
  checkedOn: string;
};

export type RegisterIndex = {
  tallies: RegisterTally[];
  rows: RegisterRow[];
  total: number;
  page: number;
  pageCount: number;
  /** Licences we have checked ourselves against an issuing authority. */
  ownChecks: number;
  /** Licence numbers on file, checked or not. */
  licenceNumbersOnFile: number;
};

type Raw = {
  register: PublishedRegister;
  listed: boolean;
  checked_on: string;
  businesses: { slug: string; name: string; status: string; deleted_at: string | null } | null;
};

const EMPTY: RegisterIndex = {
  tallies: [],
  rows: [],
  total: 0,
  page: 1,
  pageCount: 1,
  ownChecks: 0,
  licenceNumbersOnFile: 0,
};

/**
 * Reads every published register row, groups them by operator and returns one
 * page of operators plus the whole-register tallies.
 *
 * The rows are read in full rather than paged in SQL because the page's unit is
 * the *operator* and an operator's rows span registers: paging the rows would
 * cut an operator in half across a page boundary and misreport both halves.
 * 1,370 published rows is a single read at the pooler's 1,000-row ceiling plus
 * one, which is why it pages through fetchAllRows-style ranges here.
 */
export const getRegisterIndex = cache(
  async (opts: { page?: number; register?: PublishedRegister } = {}): Promise<RegisterIndex> => {
    try {
      const supabase = createPublicClient();

      const all: Raw[] = [];
      const STEP = 1000;
      for (let from = 0; ; from += STEP) {
        let q = supabase
          .from('business_registers')
          .select('register, listed, checked_on, businesses!inner (slug, name, status, deleted_at)')
          .in('register', PUBLISHED_REGISTERS)
          .eq('businesses.status', 'approved')
          .is('businesses.deleted_at', null)
          .order('register')
          .range(from, from + STEP - 1);
        if (opts.register) q = q.eq('register', opts.register);

        const { data, error } = await q;
        if (error) throw new Error(error.message);
        const batch = (data ?? []) as unknown as Raw[];
        all.push(...batch);
        if (batch.length < STEP) break;
        if (all.length > 50_000) break;
      }

      // Tallies are computed over every published row, not the current page, so
      // the header numbers describe the register rather than the screen.
      const tallies: RegisterTally[] = PUBLISHED_REGISTERS.filter(
        (r) => !opts.register || r === opts.register,
      ).map((register) => {
        const mine = all.filter((x) => x.register === register);
        const dates = mine.map((x) => x.checked_on).sort();
        return {
          register,
          listed: mine.filter((x) => x.listed).length,
          absent: mine.filter((x) => !x.listed).length,
          from: dates[0] ?? null,
          to: dates[dates.length - 1] ?? null,
        };
      });

      const byOperator = new Map<string, RegisterRow>();
      for (const r of all) {
        const biz = r.businesses;
        if (!biz) continue;
        let row = byOperator.get(biz.slug);
        if (!row) {
          row = { slug: biz.slug, name: biz.name, listedOn: [], absentFrom: [], checkedOn: r.checked_on };
          byOperator.set(biz.slug, row);
        }
        (r.listed ? row.listedOn : row.absentFrom).push(r.register);
        if (r.checked_on > row.checkedOn) row.checkedOn = r.checked_on;
      }

      for (const row of byOperator.values()) {
        row.listedOn.sort((a, b) => REGISTER_ORDER.indexOf(a) - REGISTER_ORDER.indexOf(b));
        row.absentFrom.sort((a, b) => REGISTER_ORDER.indexOf(a) - REGISTER_ORDER.indexOf(b));
      }

      // Operators found on the most registers first: the page leads with what
      // it can say, and the ones we found nowhere are the long tail rather than
      // the headline. Name breaks ties so paging is stable.
      const sorted = [...byOperator.values()].sort(
        (a, b) => b.listedOn.length - a.listedOn.length || a.name.localeCompare(b.name),
      );

      const total = sorted.length;
      const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
      const page = Math.min(Math.max(1, opts.page ?? 1), pageCount);

      // Our own licence checks, stated even when the answer is zero — that
      // number is the honest headline, not an omission.
      const [checked, onFile] = await Promise.all([
        supabase
          .from('businesses')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved')
          .not('license_checked_at', 'is', null),
        supabase
          .from('businesses')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved')
          .not('license_number', 'is', null),
      ]);

      return {
        tallies,
        rows: sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE),
        total,
        page,
        pageCount,
        ownChecks: checked.count ?? 0,
        licenceNumbersOnFile: onFile.count ?? 0,
      };
    } catch (err) {
      console.warn('getRegisterIndex:', err);
      return EMPTY;
    }
  },
);
