import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.ts';
import { extractBearerToken } from '../src/sih/auth.ts';
import { canonicalJson, deterministicResultId } from '../src/sih/canonicalJson.ts';
import { handleSihRequest } from '../src/sih/routes.ts';
import { SihRouteError } from '../src/sih/types.ts';
import {
  computeOpportunityReadiness,
  OPPORTUNITY_READINESS_ENGINE_VERSION,
} from '../../src/app/engine/opportunityReadiness.ts';

const env = {
  GROQ_API_KEYS: 'gsk_test-one',
  SUPABASE_URL: 'https://supabase.invalid',
  SUPABASE_ANON_KEY: 'public-test-key',
  SUPABASE_ELEVATED_KEY: 'elevated-do-not-leak',
};
const respond = (data, status = 200) => Response.json(data, { status });
const request = (body, authorization) => new Request('https://worker.test/sih/readiness/recompute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
  body: JSON.stringify(body),
});

test('canonical Engine B is directly importable by the Worker test bundle', () => {
  assert.equal(typeof computeOpportunityReadiness, 'function');
  assert.equal(OPPORTUNITY_READINESS_ENGINE_VERSION, 'opportunity-readiness-engine-v1.1');
});

test('canonical JSON and deterministic result identity ignore object insertion order', async () => {
  assert.equal(canonicalJson({ b: 2, a: { d: 4, c: 3 } }), canonicalJson({ a: { c: 3, d: 4 }, b: 2 }));
  assert.equal(await deterministicResultId({ b: 2, a: 1 }), await deterministicResultId({ a: 1, b: 2 }));
});

test('unknown SIH route is a bounded 404', async () => {
  const response = await handleSihRequest(new Request('https://worker.test/sih/unknown'), env, respond);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, 'NOT_FOUND');
});

test('missing and malformed bearer sessions return 401', async () => {
  const authDeps = { recompute: async (incoming) => {
    extractBearerToken(incoming);
    throw new Error('unreachable');
  } };
  for (const authorization of [undefined, 'Basic value', 'Bearer ', 'Bearer malformed token']) {
    const response = await handleSihRequest(request({ opportunityVersionId: '51000000-0000-4000-8000-000000000001' }, authorization), env, respond, authDeps);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, 'UNAUTHENTICATED');
  }
});

test('invalid or expired session and account without actor are distinct', async () => {
  for (const [error, status, code] of [
    [new SihRouteError('UNAUTHENTICATED', 401, 'A valid bearer session is required.'), 401, 'UNAUTHENTICATED'],
    [new SihRouteError('NO_ACTIVE_SIH_ACTOR', 403, 'No active SIH actor is linked.'), 403, 'NO_ACTIVE_SIH_ACTOR'],
  ]) {
    const response = await handleSihRequest(
      request({ opportunityVersionId: '51000000-0000-4000-8000-000000000001' }, 'Bearer valid.token.value'),
      env, respond, { recompute: async () => { throw error; } },
    );
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }
});

test('actor identity and browser-computed readiness fields cannot enter the request', async () => {
  let called = false;
  const deps = { recompute: async () => { called = true; return {}; } };
  for (const extra of [
    { actorId: '20000000-0000-4000-8000-000000000999' },
    { subjectActorId: '20000000-0000-4000-8000-000000000999' },
    { readinessBand: 'READY_FOR_REVIEW' },
    { eligibilityStatus: 'ELIGIBLE', engineVersion: 'browser-version' },
    { result: { readinessBand: 'READY_FOR_REVIEW' } },
  ]) {
    const response = await handleSihRequest(request({
      opportunityVersionId: '51000000-0000-4000-8000-000000000001', ...extra,
    }, 'Bearer valid.token.value'), env, respond, deps);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_REQUEST');
  }
  assert.equal(called, false);
});

test('unexpected persistence errors neither return nor log the elevated key', async () => {
  const logged = [];
  const originalError = console.error;
  console.error = (...values) => logged.push(values);
  try {
    const response = await handleSihRequest(
      request({ opportunityVersionId: '51000000-0000-4000-8000-000000000001' }, 'Bearer valid.token.value'),
      env, respond, { recompute: async () => { throw new Error(`database ${env.SUPABASE_ELEVATED_KEY}`); } },
    );
    const serialized = JSON.stringify(await response.json());
    assert.equal(response.status, 500);
    assert.equal(serialized.includes(env.SUPABASE_ELEVATED_KEY), false);
    assert.equal(JSON.stringify(logged).includes(env.SUPABASE_ELEVATED_KEY), false);
  } finally {
    console.error = originalError;
  }
});

test('existing AI route keeps authentication, proxying, and operational headers', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push([String(url), init]);
    if (String(url).endsWith('/auth/v1/user')) return Response.json({ id: 'auth-user' });
    return Response.json({ choices: [{ message: { content: 'ok' } }] });
  };
  try {
    const response = await worker.fetch(new Request('https://worker.test/ai', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid.token.value', 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
    }), env);
    assert.equal(response.status, 200);
    assert.equal(calls.length, 2);
    assert.match(calls[0][0], /\/auth\/v1\/user$/);
    assert.match(calls[1][0], /api\.groq\.com/);
    assert.ok(response.headers.get('X-CareerCase-AI-Model'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('existing AI route still requires a Supabase session', async () => {
  const response = await worker.fetch(new Request('https://worker.test/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }), env);
  assert.equal(response.status, 401);
});

test('existing AI response-format fallback and streaming paths remain operational', async () => {
  const originalFetch = globalThis.fetch;
  let groqCalls = 0;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/auth/v1/user')) return Response.json({ id: 'auth-user' });
    groqCalls++;
    if (groqCalls === 1) return Response.json({
      error: { message: 'Failed to validate JSON', code: 'json_validate_failed' },
    }, { status: 400 });
    return new Response('data: {"ok":true}\n\n', { status: 200 });
  };
  try {
    const response = await worker.fetch(new Request('https://worker.test/ai', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid.token.value', 'Content-Type': 'application/json', 'X-Stream': '1',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Return JSON.' }], response_format: { type: 'json_object' },
      }),
    }), { ...env, GROQ_API_KEYS: 'gsk_stream-test' });
    assert.equal(response.status, 200);
    assert.equal(groqCalls, 2);
    assert.equal(response.headers.get('Content-Type'), 'text/event-stream');
    assert.match(await response.text(), /^data:/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('existing OPTIONS handling and CORS allowlist remain active for SIH routes', async () => {
  const response = await worker.fetch(new Request('https://worker.test/sih/readiness/recompute', {
    method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' },
  }), env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5173');
});
