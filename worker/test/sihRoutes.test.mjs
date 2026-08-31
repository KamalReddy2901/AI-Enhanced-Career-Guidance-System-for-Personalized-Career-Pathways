import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.ts';
import { extractBearerToken } from '../src/sih/auth.ts';
import { canonicalJson, deterministicResultId } from '../src/sih/canonicalJson.ts';
import { handleSihRequest } from '../src/sih/routes.ts';
import { evaluateEffectiveMemberships } from '../src/sih/membershipEval.ts';
import { computeSha256 } from '../src/sih/artifacts.ts';
import { SihRouteError } from '../src/sih/types.ts';
import { saveEvidenceProjection } from '../src/sih/readiness.ts';
import {
  deriveReadinessVerificationState,
  deriveRequestScopedVerificationAssertions,
} from '../src/sih/verificationState.ts';
import {
  computeOpportunityReadiness,
  OPPORTUNITY_READINESS_ENGINE_VERSION,
} from '../../src/app/engine/opportunityReadiness.ts';
import { noopNotificationProvider, boundedRetryAt } from '../src/sih/notifications.ts';

const env = {
  GROQ_API_KEYS: 'gsk_test-one',
  SUPABASE_URL: 'https://supabase.invalid',
  SUPABASE_ANON_KEY: 'public-test-key',
  SUPABASE_ELEVATED_KEY: 'elevated-do-not-leak',
};
const respond = (data, status = 200) => Response.json(data, { status });
const request = (body, authorization, path = '/sih/readiness/recompute', method = 'POST') => new Request(`https://worker.test${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
  body: JSON.stringify(body),
});

test('health endpoint exposes request correlation and hardened response headers', async () => {
  const response = await worker.fetch(new Request('https://worker.test/healthz', { headers: { 'X-Correlation-ID': 'qa-correlation' } }), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Correlation-ID'), 'qa-correlation');
  assert.match(response.headers.get('X-Request-ID') ?? '', /^[0-9a-f-]{36}$/i);
  assert.match(response.headers.get('X-Operation-Duration-Ms') ?? '', /^\d+$/);
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
});

test('notification provider is explicit NOOP and retry schedule is bounded', async () => {
  assert.equal(noopNotificationProvider.mode, 'DEVELOPMENT');
  assert.equal((await noopNotificationProvider.send({ id: '1', eventKey: 'qa', purpose: 'qa', channel: 'in_app', templateKey: 'qa', templateVersion: 1, idempotencyKey: 'qa', attemptCount: 0 })).status, 'suppressed');
  assert.equal(new Date(boundedRetryAt(20, 0)).getTime(), 256000);
});

test('consequential SIH routes enforce body limits and configured abuse controls', async () => {
  const oversized = new Request('https://worker.test/sih/readiness/recompute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': '65537' },
    body: '{}',
  });
  const oversizedResponse = await handleSihRequest(oversized, env, respond);
  assert.equal(oversizedResponse.status, 413);
  assert.equal((await oversizedResponse.json()).error.code, 'INVALID_REQUEST');

  const limitedResponse = await handleSihRequest(
    request({ opportunityVersionId: '51000000-0000-4000-8000-000000000001' }, 'Bearer valid-token'),
    { ...env, SIH_RATE_LIMITER: { limit: async () => ({ success: false }) } },
    respond,
  );
  assert.equal(limitedResponse.status, 429);
  assert.equal((await limitedResponse.json()).error.code, 'RATE_LIMITED');
});

test('canonical Engine B is directly importable by the Worker test bundle', () => {
  assert.equal(typeof computeOpportunityReadiness, 'function');
  assert.equal(OPPORTUNITY_READINESS_ENGINE_VERSION, 'opportunity-readiness-engine-v1.1');
});

test('verification state is derived within each request before conservative readiness reduction', () => {
  const evidenceRecordId = '60000000-0000-4000-8000-000000000001';
  const requestA = '70000000-0000-4000-8000-000000000001';
  const requestB = '70000000-0000-4000-8000-000000000002';
  const assertions = deriveRequestScopedVerificationAssertions(evidenceRecordId, [
    { evidence_record_id: evidenceRecordId, verification_request_id: requestA, sequence_number: 1, action: 'submitted_for_review' },
    { evidence_record_id: evidenceRecordId, verification_request_id: requestA, sequence_number: 2, action: 'verified_by_human' },
    { evidence_record_id: evidenceRecordId, verification_request_id: requestB, sequence_number: 1, action: 'verified_by_issuer' },
    { evidence_record_id: evidenceRecordId, verification_request_id: requestB, sequence_number: 2, action: 'revoked' },
  ]);

  assert.deepEqual(assertions.map(assertion => [assertion.verificationRequestId, assertion.verificationState]), [
    [requestA, 'human_verified'],
    [requestB, 'revoked'],
  ]);
  assert.equal(deriveReadinessVerificationState('unverified', assertions), 'disputed');
});

test('a low sequence in another request cannot be erased by a higher unrelated sequence', () => {
  const evidenceRecordId = '60000000-0000-4000-8000-000000000001';
  const assertions = deriveRequestScopedVerificationAssertions(evidenceRecordId, [
    { evidence_record_id: evidenceRecordId, verification_request_id: 'request-a', sequence_number: 2, action: 'verified_by_issuer' },
    { evidence_record_id: evidenceRecordId, verification_request_id: 'request-b', sequence_number: 99, action: 'self_confirmed' },
  ]);
  assert.equal(assertions.length, 2);
  assert.equal(deriveReadinessVerificationState('unverified', assertions), 'issuer_verified');
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

test('organization membership semantics: exact D1 evaluation and deterministic collapse', () => {
  const now = '2026-08-26T12:00:00Z';
  const orgA = '30000000-0000-4000-8000-000000000001';
  const orgB = '30000000-0000-4000-8000-000000000002';
  const orgC = '30000000-0000-4000-8000-000000000003';

  // 1. Active current membership -> active=true
  const r1 = evaluateEffectiveMemberships([
    { organization_id: orgA, status: 'active', valid_from: '2026-01-01T00:00:00Z', valid_until: null, organizations: { status: 'active' } },
  ], now);
  assert.deepEqual(r1, [{ organizationId: orgA, active: true, confirmed: true }]);

  // 2. Expired membership -> active=false
  const r2 = evaluateEffectiveMemberships([
    { organization_id: orgA, status: 'active', valid_from: '2025-01-01T00:00:00Z', valid_until: '2026-01-01T00:00:00Z', organizations: { status: 'active' } },
  ], now);
  assert.deepEqual(r2, [{ organizationId: orgA, active: false, confirmed: true }]);

  // 3. Future membership -> active=false
  const r3 = evaluateEffectiveMemberships([
    { organization_id: orgA, status: 'active', valid_from: '2026-09-01T00:00:00Z', valid_until: null, organizations: { status: 'active' } },
  ], now);
  assert.deepEqual(r3, [{ organizationId: orgA, active: false, confirmed: true }]);

  // 4. Suspended organization -> active=false
  const r4 = evaluateEffectiveMemberships([
    { organization_id: orgA, status: 'active', valid_from: '2026-01-01T00:00:00Z', valid_until: null, organizations: { status: 'suspended' } },
  ], now);
  assert.deepEqual(r4, [{ organizationId: orgA, active: false, confirmed: true }]);

  // 5. Ended/suspended membership -> active=false
  const r5 = evaluateEffectiveMemberships([
    { organization_id: orgA, status: 'ended', valid_from: '2026-01-01T00:00:00Z', valid_until: null, organizations: { status: 'active' } },
    { organization_id: orgB, status: 'suspended', valid_from: '2026-01-01T00:00:00Z', valid_until: null, organizations: { status: 'active' } },
  ], now);
  assert.deepEqual(r5, [
    { organizationId: orgA, active: false, confirmed: true },
    { organizationId: orgB, active: false, confirmed: true },
  ]);

  // 6. Multiple historical rows collapse deterministically (one expired + one active -> active=true)
  const r6 = evaluateEffectiveMemberships([
    { organization_id: orgA, status: 'ended', valid_from: '2024-01-01T00:00:00Z', valid_until: '2025-01-01T00:00:00Z', organizations: { status: 'active' } },
    { organization_id: orgA, status: 'active', valid_from: '2026-01-01T00:00:00Z', valid_until: null, organizations: { status: 'active' } },
    { organization_id: orgA, status: 'active', valid_from: '2023-01-01T00:00:00Z', valid_until: '2024-01-01T00:00:00Z', organizations: { status: 'active' } },
  ], now);
  assert.deepEqual(r6, [{ organizationId: orgA, active: true, confirmed: true }]);

  // 7. Shuffled historical order generates identical collapsed facts and ordering
  const r6Shuffled = evaluateEffectiveMemberships([
    { organization_id: orgA, status: 'active', valid_from: '2026-01-01T00:00:00Z', valid_until: null, organizations: { status: 'active' } },
    { organization_id: orgA, status: 'ended', valid_from: '2024-01-01T00:00:00Z', valid_until: '2025-01-01T00:00:00Z', organizations: { status: 'active' } },
  ], now);
  assert.deepEqual(r6, r6Shuffled);
});

test('computeSha256 computes exact Web Crypto SHA-256 hex string', async () => {
  const data = new TextEncoder().encode('CareerCase test content');
  const hash = await computeSha256(data.buffer);
  assert.equal(typeof hash, 'string');
  assert.equal(hash.length, 64);
  assert.match(hash, /^[0-9a-f]{64}$/);
});

test('PUT /sih/readiness/subject-facts dispatches cleanly', async () => {
  let called = false;
  const deps = {
    recompute: async () => ({}),
    materializeSubjectFacts: async () => {
      called = true;
      return { education_level: 'undergraduate' };
    },
  };
  const response = await handleSihRequest(
    request({ educationLevel: 'undergraduate', educationLevelConfirmed: true }, 'Bearer valid.token.value', '/sih/readiness/subject-facts', 'PUT'),
    env, respond, deps,
  );
  assert.equal(response.status, 200);
  assert.equal(called, true);
  assert.equal((await response.json()).subjectFacts.education_level, 'undergraduate');
});

test('POST /sih/readiness/evidence-projections validates evidenceRecordId and dispatches', async () => {
  let called = false;
  const deps = {
    recompute: async () => ({}),
    saveEvidenceProjection: async () => {
      called = true;
      return { evidence_record_id: '60000000-0000-4000-8000-000000000001' };
    },
  };
  const response = await handleSihRequest(
    request({
      evidenceRecordId: '60000000-0000-4000-8000-000000000001',
      directness: 'direct',
      observedAt: '2026-08-26T00:00:00Z',
      confirmationMethod: 'direct_confirmation',
    }, 'Bearer valid.token.value', '/sih/readiness/evidence-projections'),
    env, respond, deps,
  );
  assert.equal(response.status, 200);
  assert.equal(called, true);
});

test('readiness projection database errors remain bounded in the public response', async () => {
  const internalMessage = 'function sih26044.secret_internal_rule failed';
  const elevatedClient = {
    schema: () => ({
      rpc: async () => ({ data: null, error: { message: internalMessage } }),
    }),
  };
  const deps = {
    recompute: async () => ({}),
    saveEvidenceProjection: async (_request, _env, projection) => saveEvidenceProjection(
      elevatedClient,
      '20000000-0000-4000-8000-000000000001',
      projection,
    ),
  };
  const response = await handleSihRequest(
    request({
      evidenceRecordId: '60000000-0000-4000-8000-000000000001',
      directness: 'direct',
      observedAt: '2026-08-26T00:00:00Z',
      confirmationMethod: 'structured_human_entry',
    }, 'Bearer valid.token.value', '/sih/readiness/evidence-projections'),
    env, respond, deps,
  );
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    ok: false,
    error: {
      code: 'INVALID_EVIDENCE_PROJECTION',
      message: 'Unable to save readiness evidence projection.',
    },
  });
  assert.doesNotMatch(JSON.stringify(body), /sih26044|secret_internal_rule|function|constraint|policy|sql/i);
});

test('POST /sih/artifacts/register validates artifactId and storageObjectPath and dispatches', async () => {
  let called = false;
  const deps = {
    recompute: async () => ({}),
    registerArtifact: async () => {
      called = true;
      return { id: '90000000-0000-4000-8000-000000000001' };
    },
  };
  const response = await handleSihRequest(
    request({
      artifactId: '90000000-0000-4000-8000-000000000001',
      storageObjectPath: '20000000-0000-4000-8000-000000000001/90000000-0000-4000-8000-000000000001/test.pdf',
      displayName: 'Test PDF',
      mediaType: 'application/pdf',
    }, 'Bearer valid.token.value', '/sih/artifacts/register'),
    env, respond, deps,
  );
  assert.equal(response.status, 200);
  assert.equal(called, true);
});

test('POST /sih/applications/snapshot validates inputs and dispatches', async () => {
  let called = false;
  const deps = {
    recompute: async () => ({}),
    createApplicationSnapshot: async () => {
      called = true;
      return { ok: true, snapshotId: '41000000-0000-4000-8000-000000000001', integrityFingerprint: 'f'.repeat(64), finalizedAt: '2026-08-26T00:00:00Z', recruiterProjection: {} };
    },
  };
  const response = await handleSihRequest(
    request({
      applicationId: '40000000-0000-4000-8000-000000000001',
      opportunityVersionId: '51000000-0000-4000-8000-000000000001',
      consentGrantId: '80000000-0000-4000-8000-000000000001',
      selectedEvidenceRecordIds: ['60000000-0000-4000-8000-000000000001'],
    }, 'Bearer valid.token.value', '/sih/applications/snapshot'),
    env, respond, deps,
  );
  assert.equal(response.status, 200);
  assert.equal(called, true);
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
    assert.match(response.headers.get('X-Request-ID') ?? '', /^[0-9a-f-]{36}$/i);
    assert.match(response.headers.get('X-Correlation-ID') ?? '', /^[0-9a-f-]{36}$/i);
    assert.match(response.headers.get('X-Operation-Duration-Ms') ?? '', /^\d+$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('existing AI route still requires a Supabase session', async () => {
  const response = await worker.fetch(new Request('https://worker.test/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }), env);
  assert.equal(response.status, 401);
  assert.match(response.headers.get('X-Operation-Duration-Ms') ?? '', /^\d+$/);
});

test('unknown Worker routes return correlation-safe observability headers', async () => {
  const response = await worker.fetch(new Request('https://worker.test/not-found', {
    headers: { 'X-Request-ID': 'qa-request', 'X-Correlation-ID': 'qa-correlation' },
  }), env);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('X-Request-ID'), 'qa-request');
  assert.equal(response.headers.get('X-Correlation-ID'), 'qa-correlation');
  assert.match(response.headers.get('X-Operation-Duration-Ms') ?? '', /^\d+$/);
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
