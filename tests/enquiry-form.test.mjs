// Run with: npm test
//
// The enquiry form is the one thing this site cannot afford to have broken,
// and it broke silently once (see lib/leads/validate.ts). These run on every
// pull request with no database and no browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  checkQuoteForm,
  HONEYPOT_FIELD,
  MIN_MESSAGE_LENGTH,
} from '../lib/leads/validate.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/** A form as a real traveller's browser would send it. */
function form(overrides = {}) {
  const fd = new FormData();
  const fields = {
    fullName: 'Amina Traveller',
    email: 'amina@example.com',
    message: 'Five days in the Serengeti for two adults in July, mid-range lodges.',
    adults: '2',
    children: '0',
    [HONEYPOT_FIELD]: '',
    ...overrides,
  };
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) fd.set(k, v);
  return fd;
}

test('a complete enquiry is accepted', () => {
  const result = checkQuoteForm(form());
  assert.equal(result.kind, 'ok');
  assert.equal(result.value.email, 'amina@example.com');
  assert.equal(result.value.adults, 2);
});

test('an enquiry with only the required fields is accepted', () => {
  const result = checkQuoteForm(form({ adults: undefined, children: undefined }));
  assert.equal(result.kind, 'ok');
  assert.equal(result.value.adults, 1);
  assert.equal(result.value.children, 0);
});

test('each missing or invalid field names its own error', () => {
  const cases = [
    [{ fullName: '  ' }, 'nameRequired'],
    [{ email: '' }, 'emailRequired'],
    [{ email: 'not-an-email' }, 'emailInvalid'],
    [{ message: 'x'.repeat(MIN_MESSAGE_LENGTH - 1) }, 'messageRequired'],
    [{ travelStart: '2027-07-10', travelEnd: '2027-07-01' }, 'datesInvalid'],
    [{ adults: '0' }, 'travelersInvalid'],
    [{ adults: '41' }, 'travelersInvalid'],
    [{ children: '-1' }, 'travelersInvalid'],
  ];
  for (const [overrides, error] of cases) {
    assert.deepEqual(checkQuoteForm(form(overrides)), { kind: 'error', error }, JSON.stringify(overrides));
  }
});

test('a filled honeypot is caught, and only a filled one', () => {
  assert.equal(checkQuoteForm(form({ [HONEYPOT_FIELD]: 'Acme Ltd' })).kind, 'honeypot');
  assert.equal(checkQuoteForm(form({ [HONEYPOT_FIELD]: '   ' })).kind, 'ok');
});

test('the honeypot is not a name browsers autofill', () => {
  // The bug this guards against: the field was called `company`, Chrome filled
  // it for every traveller with autofill on, and every enquiry was discarded.
  const autofilled =
    /^(name|fname|lname|first|last|full|email|e-mail|mail|tel|phone|mobile|company|organi[sz]ation|org|address|street|city|town|state|province|zip|postal|postcode|country|url|website|username|user|password|cc|card)/i;
  assert.doesNotMatch(HONEYPOT_FIELD, autofilled);
  for (const word of ['name', 'email', 'phone', 'company', 'address', 'website']) {
    assert.ok(!HONEYPOT_FIELD.toLowerCase().includes(word), `honeypot name contains "${word}"`);
  }
});

test('the form renders the honeypot the server checks, out of the tab order', () => {
  const wizard = read('components/quote/quote-wizard.tsx');
  const input = wizard.match(new RegExp(`<input[^>]*name="${HONEYPOT_FIELD}"[^>]*>`));
  assert.ok(input, `quote-wizard.tsx has no <input name="${HONEYPOT_FIELD}">`);
  assert.match(input[0], /tabIndex=\{-1\}/);
  assert.match(input[0], /autoComplete="off"/);
});

test('every field the server reads is one the form sends', () => {
  // The wizard builds its FormData by hand, so a renamed field on either side
  // compiles, submits, and silently stores nothing.
  const wizard = read('components/quote/quote-wizard.tsx');
  const server = read('lib/leads/actions.ts') + read('lib/leads/validate.ts');

  const sent = new Set([...wizard.matchAll(/fd\.(?:set|append)\(\s*'([A-Za-z_]+)'/g)].map((m) => m[1]));
  sent.add(HONEYPOT_FIELD); // a real <input>, picked up by new FormData(form)

  const read_ = new Set(
    [
      ...server.matchAll(/(?:str|nullable|num)\(\s*(?:fd|formData)\s*,\s*'([A-Za-z_]+)'/g),
      ...server.matchAll(/formData\.get(?:All)?\(\s*'([A-Za-z_]+)'/g),
    ].map((m) => m[1]),
  );

  assert.ok(read_.size >= 15, `expected to find the server's fields, found ${read_.size}`);
  const missing = [...read_].filter((f) => !sent.has(f));
  assert.deepEqual(missing, [], `the server reads fields the form never sends: ${missing.join(', ')}`);
});

test('the server action still runs the shared check before saving anything', () => {
  const action = read('lib/leads/actions.ts');
  const check = action.indexOf('checkQuoteForm(formData)');
  const insert = action.indexOf(".from('leads')");
  assert.ok(check > -1, 'submitQuoteRequest no longer calls checkQuoteForm');
  assert.ok(insert > check, 'the lead is inserted before the form is checked');
});
