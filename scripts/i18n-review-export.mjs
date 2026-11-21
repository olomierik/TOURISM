import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Exports every interface string per language for a native speaker to review
 * (SEO brief T7, 21 Nov 2026).
 *
 * One CSV per served language in i18n-review/<locale>.csv:
 *
 *   key, english, current, status
 *
 * status is "missing" (the key is absent, so English shows), "same-as-english"
 * (present but identical to English: either a name like "WhatsApp", which is
 * fine, or a string nobody translated), or "ok". Missing and same-as-English
 * sort first, because that is where a reviewer's time pays.
 *
 * Nothing here translates anything. The brief is explicit that new strings are
 * not machine-translated into production; a reviewer fills the column, and the
 * values go back into messages/<locale>.json by hand.
 *
 *   node scripts/i18n-review-export.mjs
 */

const SERVED = ['de', 'fr', 'it'];

const flat = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, String(v)]],
  );

const csv = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
const en = Object.fromEntries(flat(JSON.parse(readFileSync('messages/en.json', 'utf8'))));

mkdirSync('i18n-review', { recursive: true });
for (const locale of SERVED) {
  const tr = Object.fromEntries(flat(JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'))));
  const rows = Object.entries(en).map(([key, english]) => {
    const current = tr[key];
    const status = current === undefined ? 'missing' : current === english && /[a-z]{3}/i.test(english) ? 'same-as-english' : 'ok';
    return { key, english, current: current ?? '', status };
  });
  const rank = { missing: 0, 'same-as-english': 1, ok: 2 };
  rows.sort((a, b) => rank[a.status] - rank[b.status] || a.key.localeCompare(b.key));
  const body = ['key,english,current,status', ...rows.map((r) => [r.key, r.english, r.current, r.status].map(csv).join(','))].join('\n');
  // BOM so Excel opens the umlauts and accents correctly.
  writeFileSync(`i18n-review/${locale}.csv`, `﻿${body}\n`);
  const count = (s) => rows.filter((r) => r.status === s).length;
  console.log(`${locale}: ${rows.length} strings, ${count('missing')} missing, ${count('same-as-english')} same as English -> i18n-review/${locale}.csv`);
}
