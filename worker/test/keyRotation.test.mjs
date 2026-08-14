import assert from 'node:assert/strict';
import test from 'node:test';
import { executeWithKeyRotation, KeyPool, retryAfterMs } from '../src/keyRotation.ts';

const response = (status, retryAfter = null) => ({
  status,
  headers: { get: (name) => name.toLowerCase() === 'retry-after' ? retryAfter : null },
});

test('selects healthy keys in round-robin order', () => {
  const pool = new KeyPool();
  const keys = ['key-a', 'key-b', 'key-c'];
  assert.deepEqual([pool.next(keys, 0), pool.next(keys, 0), pool.next(keys, 0), pool.next(keys, 0)],
    ['key-a', 'key-b', 'key-c', 'key-a']);
});

test('skips a 429 key for the Retry-After duration', async () => {
  const pool = new KeyPool();
  const calls = [];
  const result = await executeWithKeyRotation(['key-a', 'key-b'], pool, async (key) => {
    calls.push(key);
    return calls.length === 1 ? response(429, '120') : response(200);
  }, { now: () => 1_000, delay: async () => {} });

  assert.equal(result?.status, 200);
  assert.deepEqual(calls, ['key-a', 'key-b']);
  assert.equal(pool.next(['key-a'], 120_999), '');
  assert.equal(pool.next(['key-a'], 121_000), 'key-a');
});

test('quarantines a 401 key and tries the next key', async () => {
  const calls = [];
  const result = await executeWithKeyRotation(['key-a', 'key-b'], new KeyPool(), async (key) => {
    calls.push(key);
    return calls.length === 1 ? response(401) : response(200);
  }, { now: () => 0, delay: async () => {} });

  assert.equal(result?.status, 200);
  assert.deepEqual(calls, ['key-a', 'key-b']);
});

test('retries one 5xx response and returns the next result', async () => {
  const calls = [];
  const result = await executeWithKeyRotation(['key-a', 'key-b'], new KeyPool(), async (key) => {
    calls.push(key);
    return calls.length === 1 ? response(503) : response(200);
  }, { now: () => 0, delay: async () => {} });

  assert.equal(result?.status, 200);
  assert.deepEqual(calls, ['key-a', 'key-b']);
});

test('returns a second 5xx without retrying indefinitely', async () => {
  let calls = 0;
  const result = await executeWithKeyRotation(['key-a', 'key-b'], new KeyPool(), async () => {
    calls++;
    return response(503);
  }, { now: () => 0, delay: async () => {} });

  assert.equal(result?.status, 503);
  assert.equal(calls, 2);
});

test('does not rotate for a request-level 400 response', async () => {
  let calls = 0;
  const result = await executeWithKeyRotation(['key-a', 'key-b'], new KeyPool(), async () => {
    calls++;
    return response(400);
  }, { now: () => 0, delay: async () => {} });

  assert.equal(result?.status, 400);
  assert.equal(calls, 1);
});

test('does not rotate for a permission-level 403 response', async () => {
  let calls = 0;
  const result = await executeWithKeyRotation(['key-a', 'key-b'], new KeyPool(), async () => {
    calls++;
    return response(403);
  }, { now: () => 0, delay: async () => {} });

  assert.equal(result?.status, 403);
  assert.equal(calls, 1);
});

test('returns unavailable after every key reports 429', async () => {
  const calls = [];
  const result = await executeWithKeyRotation(['key-a', 'key-b'], new KeyPool(), async (key) => {
    calls.push(key);
    return response(429, '60');
  }, { now: () => 0, delay: async () => {} });

  assert.equal(result, null);
  assert.deepEqual(calls, ['key-a', 'key-b']);
});

test('retries one network failure', async () => {
  let calls = 0;
  const result = await executeWithKeyRotation(['key-a'], new KeyPool(), async () => {
    calls++;
    if (calls === 1) throw new Error('network unavailable');
    return response(200);
  }, { now: () => 0, delay: async () => {} });

  assert.equal(result?.status, 200);
  assert.equal(calls, 2);
});

test('parses Retry-After seconds, dates, and invalid values', () => {
  assert.equal(retryAfterMs('2.5', 0), 2_500);
  assert.equal(retryAfterMs('Thu, 01 Jan 1970 00:00:10 GMT', 1_000), 9_000);
  assert.equal(retryAfterMs('invalid', 0), 65_000);
});
