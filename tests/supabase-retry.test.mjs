import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fetchRetryingTimeouts, retryInit } from '../lib/supabase/retry.ts';

const timeout = () => new Response(JSON.stringify({ code: '57014', message: 'canceling statement due to statement timeout' }), { status: 500 });
const ok = () => new Response('[]', { status: 200 });

test('a read that times out is retried and the success returned', async () => {
  let calls = 0;
  const res = await fetchRetryingTimeouts(async () => (++calls === 1 ? timeout() : ok()));
  assert.equal(res.status, 200);
  assert.equal(calls, 2);
});

test('gives up after two retries', async () => {
  let calls = 0;
  const res = await fetchRetryingTimeouts(async () => (calls++, timeout()));
  assert.equal(res.status, 500);
  assert.equal(calls, 3);
});

test('a write is never repeated', async () => {
  let calls = 0;
  const res = await fetchRetryingTimeouts(async () => (calls++, timeout()), { method: 'POST' });
  assert.equal(res.status, 500);
  assert.equal(calls, 1);
});

test('other errors are not retried', async () => {
  let calls = 0;
  await fetchRetryingTimeouts(async () => (calls++, new Response('{"code":"PGRST103"}', { status: 416 })));
  assert.equal(calls, 1);
});

test('each retry is a distinct request', () => {
  assert.equal(retryInit(undefined, 0), undefined);
  const h = new Headers(retryInit({ headers: { apikey: 'x' } }, 2).headers);
  assert.equal(h.get('x-et-retry'), '2');
  assert.equal(h.get('apikey'), 'x');
});
