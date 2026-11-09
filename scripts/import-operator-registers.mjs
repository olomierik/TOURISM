#!/usr/bin/env node
/**
 * Fold a collected operator register into the directory.
 *
 * Reads the JSON a collector wrote (see docs/operator-data-and-claim-proof.md
 * for which registers and why), matches each incoming operator against the
 * listings we already hold, and then does one of two things:
 *
 *   matched    → enrich. Fill contact fields that are empty, record the trip
 *                intents, activities and register checks. Never overwrite a
 *                value a person put there.
 *   unmatched  → insert as a stub (`is_stub = true`), which migration 059's
 *                sitemap rule already keeps out of the sitemap. The listing is
 *                reachable and searchable on the site; it is not pushed at
 *                Google as a thin page. That is the whole reason the import is
 *                safe to run at this size.
 *
 * Dry by default. `--apply` writes.
 *
 *   node scripts/import-operator-registers.mjs <file.json>
 *   node scripts/import-operator-registers.mjs <file.json> --apply
 */
import fs from 'node:fs';
import 'dotenv/config';
import { pool } from './db.mjs';

const FILE = process.argv[2];
const APPLY = process.argv.includes('--apply');
if (!FILE) {
  console.error('usage: import-operator-registers.mjs <file.json> [--apply]');
  process.exit(2);
}

const payload = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const incoming = payload.operators ?? [];
// `via` in the dataset, `source` in the collector's own output. Reading only
// one of them is how the first run recorded itself as "register:..." and lost
// the one fact this column exists to hold.
const IMPORT_SOURCE = `${payload.via ?? payload.source ?? 'register'}:${payload.collectedOn}`;

// ---------------------------------------------------------------------------
// Matching keys
//
// Three keys, strongest first. A phone number or a domain is an identity; a
// name is a guess, so the name key is only trusted when the city agrees too.
// Getting this wrong in the generous direction merges two real operators into
// one listing, which is worse than a duplicate: it hands one company's
// enquiries to another.
// ---------------------------------------------------------------------------
const phoneKey = (v) => {
  const d = String(v ?? '').replace(/\D+/g, '');
  return d.length >= 9 ? d.slice(-9) : null;
};

const domainKey = (v) => {
  if (!v) return null;
  try {
    const h = new URL(/^https?:/.test(v) ? v : `https://${v}`).hostname.toLowerCase();
    const bare = h.replace(/^www\./, '');
    // Shared hosts are not identities: two operators on the same free host are
    // two operators.
    if (/(^|\.)(wixsite|wordpress|blogspot|weebly|business\.site|facebook)\.com$/.test(bare)) {
      return null;
    }
    return bare;
  } catch {
    return null;
  }
};

const NOISE =
  /\b(ltd|limited|co|company|inc|plc|llc|t\/a|tanzania|safaris?|tours?|travel|adventures?|expeditions?|holidays?|and|the)\b/g;

const nameKey = (v) =>
  String(v ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(NOISE, ' ')
    .replace(/\s+/g, '')
    .trim() || null;

const cityKey = (v) =>
  String(v ?? '')
    .toLowerCase()
    .split(',')[0]
    .replace(/[^a-z]/g, '')
    .trim() || null;

// ---------------------------------------------------------------------------
// Value mapping
// ---------------------------------------------------------------------------
const ACTIVITY = {
  'walking-safaris': 'walking_safaris',
  'bird-watching': 'bird_watching',
  photography: 'photography',
  balloon: 'balloon',
  'day-trips': 'day_trips',
  'cultural-tours': 'cultural_tours',
  snorkeling: 'snorkeling',
  diving: 'diving',
  'spice-tours': 'spice_tours',
};

const INTENT = { safari: 'safari', mountain: 'mountain', beach: 'beach', combo: 'combo' };

/**
 * Register checks, including the absences.
 *
 * `licenseFlags` carries the positives. The statement paragraph carries the
 * negatives — "Not on the TLTO list when checked on 24 Oct 2026" — and those
 * are the rows worth having: a listing that says we read the TLTO register and
 * this operator was not on it is a listing a traveller can act on. `contact` is
 * their own phone-format check, not a register, so it is dropped rather than
 * dressed up as one.
 */
function registersFor(op) {
  const out = new Map();
  const checked = op.lastChecked || payload.collectedOn;

  for (const f of op.licenseFlags ?? []) {
    if (f === 'contact') continue;
    if (['tato', 'tlto', 'zato', 'kinapa'].includes(f)) {
      out.set(f, { register: f, listed: true, checked_on: checked });
    }
  }

  const st = op.registerStatement ?? '';
  for (const m of st.matchAll(
    /\b(TATO|TLTO|ZATO|KINAPA)\b[^.]*?\blist\b[^.]*?checked on ([0-9]{1,2} [A-Za-z]{3,} [0-9]{4})/gi,
  )) {
    const reg = m[1].toLowerCase();
    const negative = /not on the/i.test(st.slice(Math.max(0, m.index - 20), m.index + 12));
    const when = new Date(`${m[2]} UTC`);
    if (!negative || out.has(reg) || Number.isNaN(+when)) continue;
    out.set(reg, { register: reg, listed: false, checked_on: when.toISOString().slice(0, 10) });
  }
  return [...out.values()];
}

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'operator';

// ---------------------------------------------------------------------------
async function main() {
  const { rows: mine } = await pool.query(
    `select id, name, slug, city, phone, whatsapp, email::text as email, website,
            owner_id, is_stub, status::text as status, country_code
       from businesses where deleted_at is null`,
  );

  const byPhone = new Map();
  const byDomain = new Map();
  const byName = new Map();
  for (const b of mine) {
    for (const p of [b.phone, b.whatsapp]) {
      const k = phoneKey(p);
      if (k && !byPhone.has(k)) byPhone.set(k, b);
    }
    const d = domainKey(b.website);
    if (d && !byDomain.has(d)) byDomain.set(d, b);
    const n = nameKey(b.name);
    if (n) (byName.get(n) ?? byName.set(n, []).get(n)).push(b);
  }

  const plan = { enrich: [], insert: [], ambiguous: [] };

  for (const op of incoming) {
    if (op.fetchFailed) continue;
    let hit = null;
    let how = null;

    const pk = phoneKey(op.phone);
    if (pk && byPhone.has(pk)) {
      hit = byPhone.get(pk);
      how = 'phone';
    }
    if (!hit) {
      const dk = domainKey(op.website);
      if (dk && byDomain.has(dk)) {
        hit = byDomain.get(dk);
        how = 'domain';
      }
    }
    if (!hit) {
      const nk = nameKey(op.name);
      const cands = nk ? (byName.get(nk) ?? []) : [];
      const sameCity = cands.filter(
        (b) => cityKey(b.city) && cityKey(b.city) === cityKey(op.city || op.locality),
      );
      if (sameCity.length === 1) {
        hit = sameCity[0];
        how = 'name+city';
      } else if (cands.length === 1 && !cands[0].city) {
        hit = cands[0];
        how = 'name (no city on ours)';
      } else if (cands.length > 1) {
        plan.ambiguous.push({ op: op.name, candidates: cands.map((c) => c.slug) });
      }
    }

    const facts = {
      intents: (op.intents ?? []).map((i) => INTENT[i]).filter(Boolean),
      activities: (op.activities ?? []).map((a) => ACTIVITY[a]).filter(Boolean),
      registers: registersFor(op),
    };

    if (hit) plan.enrich.push({ op, hit, how, facts });
    else plan.insert.push({ op, facts });
  }

  // ---- report -------------------------------------------------------------
  const fills = { phone: 0, email: 0, website: 0, city: 0 };
  for (const { op, hit } of plan.enrich) {
    if (!hit.phone && op.phone) fills.phone++;
    if (!hit.email && op.email) fills.email++;
    if (!hit.website && op.website) fills.website++;
    if (!hit.city && (op.city || op.locality)) fills.city++;
  }
  const regTally = {};
  for (const p of [...plan.enrich, ...plan.insert]) {
    for (const r of p.facts.registers) {
      const k = `${r.register}:${r.listed ? 'listed' : 'absent'}`;
      regTally[k] = (regTally[k] ?? 0) + 1;
    }
  }
  const actTally = {};
  for (const p of [...plan.enrich, ...plan.insert]) {
    for (const a of p.facts.activities) actTally[a] = (actTally[a] ?? 0) + 1;
  }

  console.log(`\nincoming            ${incoming.length}`);
  console.log(`already here        ${plan.enrich.length}`);
  console.log(`new                 ${plan.insert.length}`);
  console.log(`ambiguous (skipped) ${plan.ambiguous.length}`);
  console.log('\nmatched by:', tally(plan.enrich.map((e) => e.how)));
  console.log('empty fields we can fill on existing listings:', fills);
  console.log('register checks:', regTally);
  console.log('activities:', actTally);
  console.log(
    'intents:',
    tally([...plan.enrich, ...plan.insert].flatMap((p) => p.facts.intents)),
  );
  if (plan.ambiguous.length) console.log('\nambiguous:', plan.ambiguous.slice(0, 10));
  console.log('\nexamples of new listings:', plan.insert.slice(0, 5).map((p) => p.op.name));

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply.');
    return;
  }

  // ---- write --------------------------------------------------------------
  const client = await pool.connect();
  let inserted = 0;
  let enriched = 0;
  try {
    await client.query('begin');

    for (const { op, hit, facts } of plan.enrich) {
      const sets = [];
      const vals = [];
      const put = (col, v) => {
        vals.push(v);
        sets.push(`${col} = $${vals.length}`);
      };
      if (!hit.phone && op.phone) put('phone', op.phone);
      if (!hit.email && op.email) put('email', op.email);
      if (!hit.website && op.website) put('website', op.website);
      if (!hit.city && (op.city || op.locality)) put('city', (op.city || op.locality).split(',')[0]);
      vals.push(payload.collectedOn);
      sets.push(`import_checked_on = $${vals.length}`);
      vals.push(hit.id);
      await client.query(
        `update businesses set ${sets.join(', ')} where id = $${vals.length}`,
        vals,
      );
      await writeFacts(client, hit.id, facts);
      enriched++;
    }

    for (const { op, facts } of plan.insert) {
      let slug = slugify(op.name);
      const { rows: clash } = await client.query('select 1 from businesses where slug = $1', [slug]);
      if (clash.length) slug = `${slug}-${op.slug.slice(0, 8)}`.slice(0, 60);
      const { rows } = await client.query(
        `insert into businesses
           (name, slug, status, city, country_code, phone, email, website,
            is_stub, import_source, import_checked_on, submitted_at)
         values ($1,$2,'approved',$3,$4,$5,$6,$7,true,$8,$9, now())
         returning id`,
        [
          op.name,
          slug,
          (op.city || op.locality || '').split(',')[0] || null,
          (op.countryCode || 'TZ').slice(0, 2).toUpperCase(),
          op.phone ?? null,
          op.email ?? null,
          op.website ?? null,
          IMPORT_SOURCE,
          payload.collectedOn,
        ],
      );
      await writeTranslationShells(client, rows[0].id);
      await writeFacts(client, rows[0].id, facts);
      inserted++;
    }

    await client.query('commit');
    console.log(`\nAPPLIED — ${enriched} enriched, ${inserted} inserted as stubs.`);
  } catch (e) {
    await client.query('rollback');
    console.error('\nROLLED BACK:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

/**
 * One empty translation row per locale, because without one the listing 404s.
 *
 * getBusinessBySlug joins `business_translations!inner` on the content locale,
 * so a listing with no row for that locale does not exist as far as the profile
 * page is concerned. The first run of this import created 513 listings and no
 * translation rows, and all 513 profile pages returned 404 while the rows sat
 * in the table looking fine.
 *
 * Every text column stays null. That is the point: we hold facts about these
 * operators — where they are, how to reach them, which registers carry them —
 * and no description. Migration 059 filled this gap with a template paragraph
 * per listing, which is what Google called low-value content. An empty field
 * renders as nothing; a template renders as 513 near-identical pages.
 */
async function writeTranslationShells(client, businessId) {
  for (const locale of ['en', 'de', 'fr', 'it', 'sw', 'zh', 'ar', 'ru', 'hi']) {
    await client.query(
      `insert into business_translations (business_id, locale)
         values ($1, $2) on conflict (business_id, locale) do nothing`,
      [businessId, locale],
    );
  }
}

async function writeFacts(client, businessId, facts) {
  for (const i of facts.intents) {
    await client.query(
      `insert into business_intents (business_id, intent, source) values ($1,$2,'register')
         on conflict (business_id, intent) do nothing`,
      [businessId, i],
    );
  }
  for (const a of facts.activities) {
    await client.query(
      `insert into business_activities (business_id, activity, source) values ($1,$2,'register')
         on conflict (business_id, activity) do nothing`,
      [businessId, a],
    );
  }
  for (const r of facts.registers) {
    await client.query(
      `insert into business_registers (business_id, register, listed, checked_on, source_url)
         values ($1,$2,$3,$4,$5)
         on conflict (business_id, register) do update
           set listed = excluded.listed, checked_on = excluded.checked_on,
               source_url = excluded.source_url, updated_at = now()`,
      [businessId, r.register, r.listed, r.checked_on, r.source_url ?? null],
    );
  }
}

const tally = (xs) =>
  xs.reduce((m, x) => ((m[x ?? 'none'] = (m[x ?? 'none'] ?? 0) + 1), m), {});

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
